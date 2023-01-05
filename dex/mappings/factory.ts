import { log } from "@graphprotocol/graph-ts";
import { PairCreated as PairCreatedEvent } from "../generated/QuasarFactory/QuasarFactory";
import { QuasarFactory, Pair, Bundle, Token } from "../generated/schema";
import { Pair as PairTemplate } from "../generated/templates";
import { fetchTokenDecimals, fetchTokenName, fetchTokenSymbol } from "./utils/erc20";
import { FACTORY_ADDRESS, ZERO_BD, ZERO_BI } from "./constants";

export function handlePairCreated(event: PairCreatedEvent): void {
  let factory = QuasarFactory.load(FACTORY_ADDRESS);

  if (!factory || factory === null) {
    factory = new QuasarFactory(FACTORY_ADDRESS);
    factory.pairCount = 0;
    factory.totalLiquidityETH = ZERO_BD;
    factory.totalLiquidityETH = ZERO_BD;
    factory.totalVolumeUSD = ZERO_BD;
    factory.totalVolumeETH = ZERO_BD;
    factory.untrackedVolumeUSD = ZERO_BD;
    factory.totalLiquidityUSD = ZERO_BD;
    factory.txCount = ZERO_BI;

    const bundle = new Bundle("1");
    bundle.ethPrice = ZERO_BD;
    bundle.save();
  }

  factory.pairCount = factory.pairCount + 1;
  factory.save();

  let token0 = Token.load(event.params.token0.toHexString());
  let token1 = Token.load(event.params.token1.toHexString());

  if (!token0 || token0 == null) {
    token0 = new Token(event.params.token0.toHexString());

    token0.symbol = fetchTokenSymbol(event.params.token0);
    token0.name = fetchTokenName(event.params.token0);

    let decimals = fetchTokenDecimals(event.params.token0);
    if (decimals === null) {
      log.debug("could not obtain decimals for token 0", []);
      return;
    }

    token0.decimals = decimals;
    token0.derivedETH = ZERO_BD;
    token0.tradeVolume = ZERO_BD;
    token0.tradeVolumeUSD = ZERO_BD;
    token0.untrackedVolumeUSD = ZERO_BD;
    token0.totalLiquidity = ZERO_BD;
    token0.txCount = ZERO_BI;
  }

  if (!token1 || token1 == null) {
    token1 = new Token(event.params.token1.toHexString());

    token1.symbol = fetchTokenSymbol(event.params.token1);
    token1.name = fetchTokenName(event.params.token1);

    let decimals = fetchTokenDecimals(event.params.token1);
    if (decimals === null) {
      log.debug("could not obtain decimals for token 1", []);
      return;
    }

    token1.decimals = decimals;
    token1.derivedETH = ZERO_BD;
    token1.tradeVolume = ZERO_BD;
    token1.tradeVolumeUSD = ZERO_BD;
    token1.untrackedVolumeUSD = ZERO_BD;
    token1.totalLiquidity = ZERO_BD;
    token1.txCount = ZERO_BI;
  }

  const pair = new Pair(event.params.pair.toHex());
  pair.token0 = token0.id;
  pair.token1 = token1.id;
  pair.liquidityProviderCount = ZERO_BI;
  pair.createdAtTimestamp = event.block.timestamp;
  pair.createdAtBlockNumber = event.block.number;
  pair.txCount = ZERO_BI;
  pair.reserve0 = ZERO_BD;
  pair.reserve1 = ZERO_BD;
  pair.trackedReserveETH = ZERO_BD;
  pair.reserveETH = ZERO_BD;
  pair.reserveUSD = ZERO_BD;
  pair.totalSupply = ZERO_BD;
  pair.volumeToken0 = ZERO_BD;
  pair.volumeToken1 = ZERO_BD;
  pair.volumeUSD = ZERO_BD;
  pair.untrackedVolumeUSD = ZERO_BD;
  pair.token0Price = ZERO_BD;
  pair.token1Price = ZERO_BD;

  token0.save();
  token1.save();
  pair.save();
  factory.save();

  PairTemplate.create(event.params.pair);
}
