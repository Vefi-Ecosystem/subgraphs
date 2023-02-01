import { Address, BigDecimal } from "@graphprotocol/graph-ts";
import { Bundle, Pair, Token } from "../generated/schema";
import { ADDRESS_ZERO, ONE_BD, WETH, WETH_USDT_PAIR, ZERO_BD } from "./constants";
import { factoryContract } from "./utils";

export const getETHPriceInUSD = (): BigDecimal => {
  const usdtPair = Pair.load(WETH_USDT_PAIR); // usdt is token0;

  if (usdtPair !== null) {
    const totalLiquidityETH = usdtPair.reserve1;
    if (totalLiquidityETH.notEqual(ZERO_BD)) {
      const usdtWeight = usdtPair.reserve1.div(totalLiquidityETH);
      return usdtPair.token0Price.times(usdtWeight);
    }
    return ZERO_BD;
  }
  return ZERO_BD;
};

const WHITELIST: Array<string> = [
  WETH,
  "0x4151ab5072198d0843cd2999590ef292f49d6c66", // USDT
];

const MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString("10");

export const findETHPerToken = (token: Token): BigDecimal => {
  if (token.id == WETH) return ONE_BD;

  for (let i = 0; i < WHITELIST.length; i++) {
    const pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]));
    if (pairAddress.toHex() != ADDRESS_ZERO) {
      const pair = Pair.load(pairAddress.toHexString());
      if (pair !== null) {
        if ((pair as Pair).token0 == token.id && (pair as Pair).reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
          const token1 = Token.load((pair as Pair).token1) as Token;
          return (pair as Pair).token1Price.times(token1.derivedETH as BigDecimal);
        }

        if ((pair as Pair).token1 == token.id && (pair as Pair).reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
          const token0 = Token.load((pair as Pair).token0) as Token;
          return (pair as Pair).token0Price.times(token0.derivedETH as BigDecimal);
        }
      }
    }
  }
  return ZERO_BD;
};

export const getTrackedVolumeInUSD = (
  bundle: Bundle,
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal => {
  const price0 = token0.derivedETH!.times(bundle.ethPrice);
  const price1 = token1.derivedETH!.times(bundle.ethPrice);

  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1)).div(BigDecimal.fromString("2"));
  }

  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0);
  }

  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1);
  }

  return ZERO_BD;
};

export function getTrackedLiquidityUSD(bundle: Bundle, tokenAmount0: BigDecimal, token0: Token, tokenAmount1: BigDecimal, token1: Token): BigDecimal {
  const price0 = token0.derivedETH!.times(bundle.ethPrice);
  const price1 = token1.derivedETH!.times(bundle.ethPrice);

  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1));
  }

  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString("2"));
  }

  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString("2"));
  }

  return ZERO_BD;
}
