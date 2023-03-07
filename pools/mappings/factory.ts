import { BigInt, log } from "@graphprotocol/graph-ts";
import { StakingPoolDeployed as StakingPoolDeployedEvent } from "../generated/StakingPoolActions/StakingPoolActions";
import { StakingPool, StakingPoolFactory, Token } from "../generated/schema";
import { StakingPool as StakingPoolTemplate } from "../generated/templates";
import { ADDRESS_ZERO, BI_18, FACTORY_ADDRESS, ZERO_BD, ZERO_BI } from "./constants";
import { fetchTokenDecimals, fetchTokenName, fetchTokenSymbol, fetchTokenTotalSupply } from "./utils/erc20";

export function handleStakingPoolDeployed(event: StakingPoolDeployedEvent): void {
  let factory = StakingPoolFactory.load(FACTORY_ADDRESS);

  if (factory === null) {
    factory = new StakingPoolFactory(FACTORY_ADDRESS);
    factory.stakesCount = 0;
    factory.poolsCount = 0;
  }

  factory.poolsCount = factory.poolsCount + 1;
  factory.save();

  let stakedToken = Token.load(event.params.token0.toHex());
  let rewardToken = Token.load(event.params.token1.toHex());

  if (stakedToken === null) {
    stakedToken = new Token(event.params.token0.toHex());
    stakedToken.name = event.params.token0.toHex() == ADDRESS_ZERO ? "Brise" : fetchTokenName(event.params.token0);
    stakedToken.symbol = event.params.token0.toHex() == ADDRESS_ZERO ? "BRISE" : fetchTokenSymbol(event.params.token0);
    let decimals = event.params.token0.toHex() == ADDRESS_ZERO ? BI_18 : fetchTokenDecimals(event.params.token0);

    if (decimals === null) {
      log.debug("could not fetch token decimals", []);
      return;
    }

    stakedToken.decimals = decimals;

    let totalSupply = event.params.token0.toHex() == ADDRESS_ZERO ? ZERO_BI : fetchTokenTotalSupply(event.params.token0);

    if (totalSupply === null) {
      log.debug("could not fetch token total supply", []);
      return;
    }

    stakedToken.totalSupply = totalSupply.div(BigInt.fromI32(10).pow(stakedToken.decimals.toI32() as u8));

    stakedToken.save();
  }

  if (rewardToken === null) {
    rewardToken = new Token(event.params.token1.toHex());
    rewardToken.name = event.params.token1.toHex() == ADDRESS_ZERO ? "Brise" : fetchTokenName(event.params.token1);
    rewardToken.symbol = event.params.token1.toHex() == ADDRESS_ZERO ? "BRISE" : fetchTokenSymbol(event.params.token1);
    let decimals = event.params.token1.toHex() == ADDRESS_ZERO ? BI_18 : fetchTokenDecimals(event.params.token1);

    if (decimals === null) {
      log.debug("could not fetch token decimals", []);
      return;
    }

    rewardToken.decimals = decimals;

    let totalSupply = event.params.token1.toHex() == ADDRESS_ZERO ? ZERO_BI : fetchTokenTotalSupply(event.params.token1);

    if (totalSupply === null) {
      log.debug("could not fetch token total supply", []);
      return;
    }

    rewardToken.totalSupply = totalSupply.div(BigInt.fromI32(10).pow(rewardToken.decimals.toI32() as u8));

    rewardToken.save();
  }

  const pool = new StakingPool(event.params.poolId.toHex());

  pool.owner = event.params.owner;
  pool.stakedToken = stakedToken.id;
  pool.rewardToken = rewardToken.id;
  pool.apy = event.params.apy;
  pool.tax = event.params.tax;
  pool.endsIn = event.params.endsIn;
  pool.blockNumber = event.block.number;
  pool.blockTimestamp = event.block.timestamp;
  pool.totalStaked = ZERO_BD;
  pool.totalRewards = ZERO_BD;

  pool.save();

  StakingPoolTemplate.create(event.params.poolId);
}
