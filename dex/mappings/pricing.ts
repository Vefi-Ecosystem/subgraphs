import { Address, BigDecimal } from "@graphprotocol/graph-ts";
import { Bundle, Pair, Token } from "../generated/schema";
import { ADDRESS_ZERO, ONE_BD, WETH, WETH_USDC_PAIR, WETH_USDT_PAIR, ZERO_BD } from "./constants";
import { factoryContract } from "./utils";

export const getETHPriceInUSD = (): BigDecimal => {
  const usdtPair = Pair.load(WETH_USDT_PAIR); // usdt is token1;
  const usdcPair = Pair.load(WETH_USDC_PAIR); // usdc is token0;

  if (!!usdtPair && !!usdcPair) {
    const totalLiquidityETH = usdtPair.reserve0.plus(usdcPair.reserve1);
    if (totalLiquidityETH.notEqual(ZERO_BD)) {
      const usdtWeight = usdtPair.reserve0.div(totalLiquidityETH);
      const usdcWeight = usdtPair.reserve1.div(totalLiquidityETH);
      return usdtPair.token1Price.times(usdtWeight).plus(usdcPair.token0Price.times(usdcWeight));
    }
    return ZERO_BD;
  } else if (!!usdtPair) {
    return usdtPair.token1Price;
  } else if (!!usdcPair) {
    return usdcPair.token0Price;
  }
  return ZERO_BD;
};

const WHITELIST: Array<string> = [
  WETH,
  "0xcf2df9377a4e3c10e9ea29fdb8879d74c27fcde7", // USDC
  "0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d", // USDT
];

const MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString("10");

export const findETHPerToken = (token: Token): BigDecimal => {
  if (token.id === WETH) return ONE_BD;

  for (let i = 0; i < WHITELIST.length; i++) {
    const pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]));
    if (pairAddress.toHex() !== ADDRESS_ZERO) {
      const pair = Pair.load(pairAddress.toHex()) as Pair;
      if (pair.token0 === token.id && pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
        const token1 = Token.load(pair.token1) as Token;
        return pair.token1Price.times(token1.derivedETH as BigDecimal);
      }

      if (pair.token1 === token.id && pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
        const token0 = Token.load(pair.token0) as Token;
        return pair.token0Price.times(token0.derivedETH as BigDecimal);
      }
    }
  }
  return ZERO_BD;
};

export const getTrackedVolumeInUSD = (bundle: Bundle, tokenAmount0: BigDecimal, token0: Token, tokenAmount1: BigDecimal, token1: Token): BigDecimal => {
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
