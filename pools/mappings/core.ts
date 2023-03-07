import { Stake, TaxPercentageChanged, Unstake, Withdrawal } from "../generated/templates/StakingPool/StakingPool";
import { Stake as StakeEvent, StakingPool, StakingPoolFactory, Token, Withdrawal as WithdrawalEvent } from "../generated/schema";
import { FACTORY_ADDRESS, ZERO_BD } from "./constants";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleStake(event: Stake): void {
  const stakeId = event.address.toHex() + ":" + event.params.account.toHex();
  let stake = StakeEvent.load(stakeId);
  const pool = StakingPool.load(event.address.toHex()) as StakingPool;
  const stakedToken = Token.load(pool.stakedToken) as Token;
  const factory = StakingPoolFactory.load(FACTORY_ADDRESS) as StakingPoolFactory;

  if (stake === null) {
    stake = new StakeEvent(stakeId);
    stake.pool = event.address.toHex();
    stake.account = event.params.account;
    stake.blockTimestamp = event.block.timestamp;
    stake.blockNumber = event.block.number;
    stake.amount = ZERO_BD;
  }
  const amountStaked = event.params.amount.div(BigInt.fromI32(10).pow(stakedToken.decimals.toI32() as u8)).toBigDecimal();
  stake.amount = stake.amount.plus(amountStaked);
  stake.save();

  pool.totalStaked = pool.totalStaked.plus(amountStaked);
  pool.save();

  factory.stakesCount = factory.stakesCount + 1;
  factory.save();
}

export function handleUnstake(event: Unstake): void {
  const stakeId = event.address.toHex() + ":" + event.params.account.toHex();
  const stake = StakeEvent.load(stakeId) as StakeEvent;
  const pool = StakingPool.load(event.address.toHex()) as StakingPool;
  const stakedToken = Token.load(pool.stakedToken) as Token;

  const amountLeft = stake.amount.minus(event.params.amount.div(BigInt.fromI32(10).pow(stakedToken.decimals.toI32() as u8)).toBigDecimal());

  stake.amount = amountLeft;
  stake.save();

  pool.totalStaked = pool.totalStaked.minus(event.params.amount.div(BigInt.fromI32(10).pow(stakedToken.decimals.toI32() as u8)).toBigDecimal());
  pool.save();
}

export function handleWithdrawal(event: Withdrawal): void {
  const withdrawalId = event.address.toHex() + ":" + event.transaction.hash.toHex() + ":" + event.params.account.toHex();
  const pool = StakingPool.load(event.address.toHex()) as StakingPool;
  const rewardToken = Token.load(pool.rewardToken) as Token;

  const amount = event.params.amount.div(BigInt.fromI32(10).pow(rewardToken.decimals.toI32() as u8)).toBigDecimal();
  const withdrawal = new WithdrawalEvent(withdrawalId);

  withdrawal.account = event.params.account;
  withdrawal.blockNumber = event.block.number;
  withdrawal.blockTimestamp = event.block.timestamp;
  withdrawal.reward = amount;
  withdrawal.pool = pool.id;

  withdrawal.save();

  pool.totalRewards = pool.totalRewards.plus(amount);
  pool.save();
}

export function handleTaxPercentageChanged(event: TaxPercentageChanged): void {
  const pool = StakingPool.load(event.address.toHex()) as StakingPool;
  pool.tax = event.params.newTaxPercentage;
  pool.save();
}
