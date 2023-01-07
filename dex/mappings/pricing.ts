import { Address, BigDecimal } from "@graphprotocol/graph-ts";
import { Bundle, Pair, Token } from "../generated/schema";
import { ADDRESS_ZERO, ONE_BD, WETH, WETH_USDC_PAIR, WETH_USDT_PAIR, ZERO_BD } from "./constants";
import { factoryContract } from "./utils";

export const getETHPriceInUSD = (): BigDecimal => {
  const usdtPair = Pair.load(WETH_USDT_PAIR); // usdt is token1;
  const usdcPair = Pair.load(WETH_USDC_PAIR); // usdc is token1;

  if (!!usdtPair && !!usdcPair) {
    const totalLiquidityETH = usdtPair.reserve0.plus(usdcPair.reserve0);
    if (totalLiquidityETH.notEqual(ZERO_BD)) {
      const usdtWeight = usdtPair.reserve0.div(totalLiquidityETH);
      const usdcWeight = usdtPair.reserve0.div(totalLiquidityETH);
      return usdtPair.token1Price.times(usdtWeight).plus(usdcPair.token1Price.times(usdcWeight));
    }
    return ZERO_BD;
  } else if (!!usdtPair) {
    return usdtPair.token1Price;
  } else if (!!usdcPair) {
    return usdcPair.token1Price;
  }
  return ZERO_BD;
};

const WHITELIST: Array<string> = [
  WETH,
  "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // USDC
  "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // USDT
  "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6", // WBTC
  "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619" // WETH (Wrapped Ether)
];

const MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString("10");

export const findETHPerToken = (token: Token): BigDecimal => {
  if (token.id === WETH) return ONE_BD;

  for (let i = 0; i < WHITELIST.length; i++) {
    const pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]));
    if (pairAddress.toHex() !== ADDRESS_ZERO) {
      const pair = Pair.load(pairAddress.toHexString());
      if (!!pair || pair !== null) {
        if ((pair as Pair).token0 === token.id && (pair as Pair).reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
          const token1 = Token.load((pair as Pair).token1) as Token;
          return (pair as Pair).token1Price.times(token1.derivedETH as BigDecimal);
        }

        if ((pair as Pair).token1 === token.id && (pair as Pair).reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
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
