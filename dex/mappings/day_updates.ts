import { ethereum, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { QuasarDayData, QuasarFactory, PairDayData, Pair, PairHourData, Token, TokenDayData, Bundle } from "../generated/schema";
import { FACTORY_ADDRESS, ZERO_BD, ZERO_BI, ONE_BI } from "./constants";

export function updateQuasarDayData(event: ethereum.Event): QuasarDayData {
  const quasar = QuasarFactory.load(FACTORY_ADDRESS) as QuasarFactory;
  const timestamp = event.block.timestamp.toI32();
  const dayID = timestamp / 86400;
  const dayStartTimestamp = dayID * 86400;

  let quasarDayData = QuasarDayData.load(dayID.toString());
  if (quasarDayData === null) {
    quasarDayData = new QuasarDayData(dayID.toString());
    quasarDayData.date = dayStartTimestamp;
    quasarDayData.dailyVolumeUSD = ZERO_BD;
    quasarDayData.dailyVolumeETH = ZERO_BD;
    quasarDayData.totalVolumeUSD = ZERO_BD;
    quasarDayData.totalVolumeETH = ZERO_BD;
    quasarDayData.dailyVolumeUntracked = ZERO_BD;
  }
  quasarDayData.totalLiquidityUSD = quasar.totalLiquidityUSD;
  quasarDayData.totalLiquidityETH = quasar.totalLiquidityETH;
  quasarDayData.txCount = quasar.txCount;
  quasarDayData.save();

  return quasarDayData as QuasarDayData;
}

export function updatePairDayData(event: ethereum.Event): PairDayData {
  const timestamp = event.block.timestamp.toI32();
  const dayID = timestamp / 86400;
  const dayStartTimestamp = dayID * 86400;
  const dayPairID = event.address.toHex().concat("-").concat(BigInt.fromI32(dayID).toString());
  const pair = Pair.load(event.address.toHex()) as Pair;
  let pairDayData = PairDayData.load(dayPairID);
  if (pairDayData === null) {
    pairDayData = new PairDayData(dayPairID);
    pairDayData.date = dayStartTimestamp;
    pairDayData.token0 = pair.token0;
    pairDayData.token1 = pair.token1;
    pairDayData.pairAddress = event.address;
    pairDayData.dailyVolumeToken0 = ZERO_BD;
    pairDayData.dailyVolumeToken1 = ZERO_BD;
    pairDayData.dailyVolumeUSD = ZERO_BD;
    pairDayData.dailyTxns = ZERO_BI;
  }
  pairDayData.totalSupply = pair.totalSupply;
  pairDayData.reserve0 = pair.reserve0;
  pairDayData.reserve1 = pair.reserve1;
  pairDayData.reserveUSD = pair.reserveUSD;
  pairDayData.dailyTxns = pairDayData.dailyTxns.plus(ONE_BI);
  pairDayData.save();

  return pairDayData as PairDayData;
}

export function updatePairHourData(event: ethereum.Event): PairHourData {
  const timestamp = event.block.timestamp.toI32();
  const hourIndex = timestamp / 3600;
  const hourStartUnix = hourIndex * 3600;
  const hourPairID = event.address.toHex().concat("-").concat(BigInt.fromI32(hourIndex).toString());
  let pair = Pair.load(event.address.toHex()) as Pair;
  let pairHourData = PairHourData.load(hourPairID);
  if (pairHourData === null) {
    pairHourData = new PairHourData(hourPairID);
    pairHourData.hourStartUnix = hourStartUnix;
    pairHourData.pair = event.address.toHex();
    pairHourData.hourlyVolumeToken0 = ZERO_BD;
    pairHourData.hourlyVolumeToken1 = ZERO_BD;
    pairHourData.hourlyVolumeUSD = ZERO_BD;
    pairHourData.hourlyTxns = ZERO_BI;
  }
  pairHourData.totalSupply = pair.totalSupply;
  pairHourData.reserve0 = pair.reserve0;
  pairHourData.reserve1 = pair.reserve1;
  pairHourData.reserveUSD = pair.reserveUSD;
  pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI);
  pairHourData.save();

  return pairHourData as PairHourData;
}

export function updateTokenDayData(token: Token, event: ethereum.Event): TokenDayData {
  const bundle = Bundle.load("1") as Bundle;
  const timestamp = event.block.timestamp.toI32();
  const dayID = timestamp / 86400;
  const dayStartTimestamp = dayID * 86400;
  const tokenDayID = token.id.toString().concat("-").concat(BigInt.fromI32(dayID).toString());

  let tokenDayData = TokenDayData.load(tokenDayID);
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayID);
    tokenDayData.date = dayStartTimestamp;
    tokenDayData.token = token.id;
    tokenDayData.priceUSD = token.derivedETH!.times(bundle.ethPrice);
    tokenDayData.dailyVolumeToken = ZERO_BD;
    tokenDayData.dailyVolumeETH = ZERO_BD;
    tokenDayData.dailyVolumeUSD = ZERO_BD;
    tokenDayData.dailyTxns = ZERO_BI;
    tokenDayData.totalLiquidityUSD = ZERO_BD;
  }
  tokenDayData.priceUSD = token.derivedETH!.times(bundle.ethPrice);
  tokenDayData.totalLiquidityToken = token.totalLiquidity;
  tokenDayData.totalLiquidityETH = token.totalLiquidity.times(token.derivedETH as BigDecimal);
  tokenDayData.totalLiquidityUSD = tokenDayData.totalLiquidityETH.times(bundle.ethPrice);
  tokenDayData.dailyTxns = tokenDayData.dailyTxns.plus(ONE_BI);
  tokenDayData.save();

  return tokenDayData as TokenDayData;
}
