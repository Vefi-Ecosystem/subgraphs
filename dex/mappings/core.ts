import { Burn as BurnEvent, Mint as MintEvent, Swap as SwapEvent, Pair, Transaction, Token, QuasarFactory, Bundle } from "../generated/schema";
import { Burn, Mint, Swap, Sync, Transfer } from "../generated/templates/Pair/Pair";
import { ADDRESS_ZERO, BI_18, FACTORY_ADDRESS, ONE_BI, ZERO_BD } from "./constants";
import { BigDecimal, BigInt, store } from "@graphprotocol/graph-ts";
import { convertTokenToDecimal } from "./utils";
import { findETHPerToken, getETHPriceInUSD, getTrackedLiquidityUSD, getTrackedVolumeInUSD } from "./pricing";
import { updatePairDayData, updatePairHourData, updateQuasarDayData, updateTokenDayData } from "./day_updates";

function isCompleteMint(mintId: string): boolean {
  return !!(MintEvent.load(mintId) as MintEvent).sender;
}

export function handleTransfer(event: Transfer): void {
  if (event.params.to.toHex() == ADDRESS_ZERO && event.params.value.equals(BigInt.fromI32(1000))) {
    return;
  }

  const pair = Pair.load(event.address.toHex()) as Pair;
  const value = convertTokenToDecimal(event.params.value, BI_18);
  let transaction = Transaction.load(event.transaction.hash.toHex());

  if (!transaction || transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHex());
    transaction.block = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.mints = [];
    transaction.burns = [];
    transaction.swaps = [];
  }

  const mints = transaction.mints;
  if (event.params.from.toHex() == ADDRESS_ZERO) {
    pair.totalSupply = pair.totalSupply.plus(value);
    pair.save();

    if (mints.length === 0 || isCompleteMint(mints[mints.length - 1])) {
      const mint = new MintEvent(event.transaction.hash.toHex().concat("-").concat(BigInt.fromI32(mints.length).toString()));
      mint.transaction = transaction.id;
      mint.pair = pair.id;
      mint.to = event.params.to;
      mint.liquidity = value;
      mint.timestamp = transaction.timestamp;
      mint.transaction = transaction.id;
      mint.save();

      transaction.mints = mints.concat([mint.id]);
      transaction.save();
    }
  }

  if (event.params.to.toHex() == pair.id) {
    let burns = transaction.burns;
    const burn = new BurnEvent(event.transaction.hash.toHex().concat("-").concat(BigInt.fromI32(burns.length).toString()));
    burn.transaction = transaction.id;
    burn.pair = pair.id;
    burn.liquidity = value;
    burn.timestamp = transaction.timestamp;
    burn.to = event.params.to;
    burn.sender = event.params.from;
    burn.needsComplete = true;
    burn.transaction = transaction.id;
    burn.save();

    burns = burns.concat([burn.id]);
    transaction.burns = burns;
    transaction.save();
  }

  if (event.params.to.toHex() == ADDRESS_ZERO && event.params.from.toHex() == pair.id) {
    pair.totalSupply = pair.totalSupply.minus(value);
    pair.save();

    let burns = transaction.burns;
    let burn: BurnEvent;
    if (burns.length > 0) {
      const currentBurn = BurnEvent.load(burns[burns.length - 1]) as BurnEvent;
      if (currentBurn.needsComplete) {
        burn = currentBurn;
      } else {
        burn = new BurnEvent(event.transaction.hash.toHex().concat("-").concat(BigInt.fromI32(burns.length).toString()));
        burn.transaction = transaction.id;
        burn.needsComplete = false;
        burn.pair = pair.id;
        burn.liquidity = value;
        burn.transaction = transaction.id;
        burn.timestamp = transaction.timestamp;
      }
    } else {
      burn = new BurnEvent(event.transaction.hash.toHex().concat("-").concat(BigInt.fromI32(burns.length).toString()));
      burn.transaction = transaction.id;
      burn.needsComplete = false;
      burn.pair = pair.id;
      burn.liquidity = value;
      burn.transaction = transaction.id;
      burn.timestamp = transaction.timestamp;
    }

    if (mints.length !== 0 && !isCompleteMint(mints[mints.length - 1])) {
      let mint = MintEvent.load(mints[mints.length - 1]) as MintEvent;
      burn.feeTo = mint.to;
      burn.feeLiquidity = mint.liquidity;
      store.remove("Mint", mints[mints.length - 1]);
      let m = mints.slice(0);
      m.pop();
      transaction.mints = m;
      transaction.save();
    }
    burn.save();
    if (burn.needsComplete) {
      burns[burns.length - 1] = burn.id;
    } else {
      // TODO: Consider using .concat() for handling array updates to protect
      // against unintended side effects for other code paths.
      burns = burns.concat([burn.id]);
    }
    transaction.burns = burns;
    transaction.save();
  }

  transaction.save();
}

export function handleSync(event: Sync): void {
  const pair = Pair.load(event.address.toHex()) as Pair;
  const token0 = Token.load(pair.token0) as Token;
  const token1 = Token.load(pair.token1) as Token;
  const quasar = QuasarFactory.load(FACTORY_ADDRESS) as QuasarFactory;

  quasar.totalLiquidityETH = quasar.totalLiquidityETH.minus(pair.trackedReserveETH);

  token0.totalLiquidity = token0.totalLiquidity.minus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.minus(pair.reserve1);

  pair.reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals);
  pair.reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals);

  if (pair.reserve1.notEqual(ZERO_BD)) pair.token0Price = pair.reserve0.div(pair.reserve1);
  else pair.token0Price = ZERO_BD;
  if (pair.reserve0.notEqual(ZERO_BD)) pair.token1Price = pair.reserve1.div(pair.reserve0);
  else pair.token1Price = ZERO_BD;

  const bundle = Bundle.load("1") as Bundle;
  bundle.ethPrice = getETHPriceInUSD();
  bundle.save();

  const t0DerivedETH = findETHPerToken(token0);
  token0.derivedETH = t0DerivedETH;
  token0.derivedUSD = t0DerivedETH.times(bundle.ethPrice);
  token0.save();

  let t1DerivedETH = findETHPerToken(token1);
  token1.derivedETH = t1DerivedETH;
  token1.derivedUSD = t1DerivedETH.times(bundle.ethPrice);
  token1.save();

  let trackedLiquidityETH: BigDecimal;
  if (bundle.ethPrice.notEqual(ZERO_BD)) {
    trackedLiquidityETH = getTrackedLiquidityUSD(bundle, pair.reserve0, token0, pair.reserve1, token1).div(bundle.ethPrice);
  } else {
    trackedLiquidityETH = ZERO_BD;
  }

  pair.trackedReserveETH = trackedLiquidityETH;
  pair.reserveETH = pair.reserve0.times(token0.derivedETH as BigDecimal).plus(pair.reserve1.times(token1.derivedETH as BigDecimal));
  pair.reserveUSD = pair.reserveETH.times(bundle.ethPrice);

  quasar.totalLiquidityETH = quasar.totalLiquidityETH.plus(trackedLiquidityETH);
  quasar.totalLiquidityUSD = quasar.totalLiquidityETH.times(bundle.ethPrice);

  token0.totalLiquidity = token0.totalLiquidity.plus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.plus(pair.reserve1);

  pair.save();
  quasar.save();
  token0.save();
  token1.save();
}

export function handleMint(event: Mint): void {
  const transaction = Transaction.load(event.transaction.hash.toHex()) as Transaction;
  const mints = transaction.mints;
  const mint = MintEvent.load(mints[mints.length - 1]) as MintEvent;

  const pair = Pair.load(event.address.toHex()) as Pair;
  const quasar = QuasarFactory.load(FACTORY_ADDRESS) as QuasarFactory;

  const token0 = Token.load(pair.token0) as Token;
  const token1 = Token.load(pair.token1) as Token;

  // update exchange info (except balances, sync will cover that)
  const token0Amount = convertTokenToDecimal(event.params.amount0, token0.decimals);
  const token1Amount = convertTokenToDecimal(event.params.amount1, token1.decimals);

  token0.txCount = token0.txCount.plus(ONE_BI);
  token1.txCount = token1.txCount.plus(ONE_BI);

  const bundle = Bundle.load("1") as Bundle;
  let amountTotalUSD = token1.derivedETH!.times(token1Amount).plus(token0.derivedETH!.times(token0Amount)).times(bundle.ethPrice);

  pair.txCount = pair.txCount.plus(ONE_BI);
  quasar.txCount = quasar.txCount.plus(ONE_BI);

  // save entities
  token0.save();
  token1.save();
  pair.save();
  quasar.save();

  mint.sender = event.params.sender;
  mint.amount0 = token0Amount as BigDecimal;
  mint.amount1 = token1Amount as BigDecimal;
  mint.logIndex = event.logIndex;
  mint.amountUSD = amountTotalUSD as BigDecimal;
  mint.save();

  updatePairDayData(event);
  updatePairHourData(event);
  updateQuasarDayData(event);
  updateTokenDayData(token0, event);
  updateTokenDayData(token1, event);
}

export function handleBurn(event: Burn): void {
  const transaction = Transaction.load(event.transaction.hash.toHex()) as Transaction;
  if (transaction === null) {
    return;
  }

  const burns = transaction.burns;
  const burn = BurnEvent.load(burns[burns.length - 1]) as BurnEvent;

  const pair = Pair.load(event.address.toHex()) as Pair;
  const quasar = QuasarFactory.load(FACTORY_ADDRESS) as QuasarFactory;

  const token0 = Token.load(pair.token0) as Token;
  const token1 = Token.load(pair.token1) as Token;
  const token0Amount = convertTokenToDecimal(event.params.amount0, token0.decimals);
  const token1Amount = convertTokenToDecimal(event.params.amount1, token1.decimals);

  token0.txCount = token0.txCount.plus(ONE_BI);
  token1.txCount = token1.txCount.plus(ONE_BI);

  const bundle = Bundle.load("1") as Bundle;
  const amountTotalUSD = token1.derivedETH!.times(token1Amount).plus(token0.derivedETH!.times(token0Amount)).times(bundle.ethPrice);

  quasar.txCount = quasar.txCount.plus(ONE_BI);
  pair.txCount = pair.txCount.plus(ONE_BI);

  // update global counter and save
  token0.save();
  token1.save();
  pair.save();
  quasar.save();

  burn.sender = event.params.sender;
  burn.amount0 = token0Amount;
  burn.amount1 = token1Amount;
  burn.to = event.params.to;
  burn.logIndex = event.logIndex;
  burn.amountUSD = amountTotalUSD as BigDecimal;
  burn.save();

  updatePairDayData(event);
  updatePairHourData(event);
  updateQuasarDayData(event);
  updateTokenDayData(token0, event);
  updateTokenDayData(token1, event);
}

export function handleSwap(event: Swap): void {
  const pair = Pair.load(event.address.toHex()) as Pair;
  const token0 = Token.load(pair.token0) as Token;
  const token1 = Token.load(pair.token1) as Token;
  const amount0In = convertTokenToDecimal(event.params.amount0In, token0.decimals);
  const amount1In = convertTokenToDecimal(event.params.amount1In, token1.decimals);
  const amount0Out = convertTokenToDecimal(event.params.amount0Out, token0.decimals);
  const amount1Out = convertTokenToDecimal(event.params.amount1Out, token1.decimals);

  const amount0Total = amount0Out.plus(amount0In);
  const amount1Total = amount1Out.plus(amount1In);

  const bundle = Bundle.load("1") as Bundle;

  const derivedAmountETH = token1.derivedETH!.times(amount1Total).plus(token0.derivedETH!.times(amount0Total)).div(BigDecimal.fromString("2"));
  const derivedAmountUSD = derivedAmountETH!.times(bundle.ethPrice);

  const trackedAmountUSD = getTrackedVolumeInUSD(bundle, amount0Total, token0, amount1Total, token1);

  let trackedAmountETH: BigDecimal;
  if (bundle.ethPrice.equals(ZERO_BD)) {
    trackedAmountETH = ZERO_BD;
  } else {
    trackedAmountETH = trackedAmountUSD.div(bundle.ethPrice);
  }

  token0.tradeVolume = token0.tradeVolume.plus(amount0In.plus(amount0Out));
  token0.tradeVolumeUSD = token0.tradeVolumeUSD.plus(trackedAmountUSD);
  token0.untrackedVolumeUSD = token0.untrackedVolumeUSD.plus(derivedAmountUSD);

  token1.tradeVolume = token1.tradeVolume.plus(amount1In.plus(amount1Out));
  token1.tradeVolumeUSD = token1.tradeVolumeUSD.plus(trackedAmountUSD);
  token1.untrackedVolumeUSD = token1.untrackedVolumeUSD.plus(derivedAmountUSD);

  token0.txCount = token0.txCount.plus(ONE_BI);
  token1.txCount = token1.txCount.plus(ONE_BI);

  pair.volumeUSD = pair.volumeUSD.plus(trackedAmountUSD);
  pair.volumeToken0 = pair.volumeToken0.plus(amount0Total);
  pair.volumeToken1 = pair.volumeToken1.plus(amount1Total);
  pair.untrackedVolumeUSD = pair.untrackedVolumeUSD.plus(derivedAmountUSD);
  pair.txCount = pair.txCount.plus(ONE_BI);
  pair.save();

  const quasar = QuasarFactory.load(FACTORY_ADDRESS) as QuasarFactory;
  quasar.totalVolumeUSD = quasar.totalVolumeUSD.plus(trackedAmountUSD);
  quasar.totalVolumeETH = quasar.totalVolumeETH.plus(trackedAmountETH);
  quasar.untrackedVolumeUSD = quasar.untrackedVolumeUSD.plus(derivedAmountUSD);
  quasar.txCount = quasar.txCount.plus(ONE_BI);

  pair.save();
  token0.save();
  token1.save();
  quasar.save();

  let transaction = Transaction.load(event.transaction.hash.toHex());
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHex());
    transaction.block = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.mints = [];
    transaction.swaps = [];
    transaction.burns = [];
  }
  let swaps = transaction.swaps;
  const swap = new SwapEvent(event.transaction.hash.toHex().concat("-").concat(BigInt.fromI32(swaps.length).toString()));

  swap.transaction = transaction.id;
  swap.pair = pair.id;
  swap.timestamp = transaction.timestamp;
  swap.transaction = transaction.id;
  swap.sender = event.params.sender;
  swap.amount0In = amount0In;
  swap.amount1In = amount1In;
  swap.amount0Out = amount0Out;
  swap.amount1Out = amount1Out;
  swap.to = event.params.to;
  swap.from = event.transaction.from;
  swap.logIndex = event.logIndex;
  swap.amountUSD = trackedAmountUSD === ZERO_BD ? derivedAmountUSD : trackedAmountUSD;
  swap.save();

  swaps = swaps.concat([swap.id]);
  transaction.swaps = swaps;
  transaction.save();

  const pairDayData = updatePairDayData(event);
  const pairHourData = updatePairHourData(event);
  const quasarDayData = updateQuasarDayData(event);
  const token0DayData = updateTokenDayData(token0 as Token, event);
  const token1DayData = updateTokenDayData(token1 as Token, event);

  quasarDayData.dailyVolumeUSD = quasarDayData.dailyVolumeUSD.plus(trackedAmountUSD);
  quasarDayData.dailyVolumeETH = quasarDayData.dailyVolumeETH.plus(trackedAmountETH);
  quasarDayData.dailyVolumeUntracked = quasarDayData.dailyVolumeUntracked.plus(derivedAmountUSD);
  quasarDayData.save();

  pairDayData.dailyVolumeToken0 = pairDayData.dailyVolumeToken0.plus(amount0Total);
  pairDayData.dailyVolumeToken1 = pairDayData.dailyVolumeToken1.plus(amount1Total);
  pairDayData.dailyVolumeUSD = pairDayData.dailyVolumeUSD.plus(trackedAmountUSD);
  pairDayData.save();

  pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(amount0Total);
  pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(amount1Total);
  pairHourData.hourlyVolumeUSD = pairHourData.hourlyVolumeUSD.plus(trackedAmountUSD);
  pairHourData.save();

  token0DayData.dailyVolumeToken = token0DayData.dailyVolumeToken.plus(amount0Total);
  token0DayData.dailyVolumeETH = token0DayData.dailyVolumeETH.plus(amount0Total.times(token0.derivedETH as BigDecimal));
  token0DayData.dailyVolumeUSD = token0DayData.dailyVolumeUSD.plus(amount0Total.times(token0.derivedETH as BigDecimal).times(bundle.ethPrice));
  token0DayData.save();

  // swap specific updating
  token1DayData.dailyVolumeToken = token1DayData.dailyVolumeToken.plus(amount1Total);
  token1DayData.dailyVolumeETH = token1DayData.dailyVolumeETH.plus(amount1Total.times(token1.derivedETH as BigDecimal));
  token1DayData.dailyVolumeUSD = token1DayData.dailyVolumeUSD.plus(amount1Total.times(token1.derivedETH as BigDecimal).times(bundle.ethPrice));
  token1DayData.save();
}
