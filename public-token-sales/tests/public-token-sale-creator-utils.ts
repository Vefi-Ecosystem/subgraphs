import { newMockEvent } from "matchstick-as"
import { ethereum, Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
import {
  OwnershipTransferred,
  Paused,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  TokenSaleItemCreated,
  Unpaused
} from "../generated/PublicTokenSaleCreator/PublicTokenSaleCreator"

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPausedEvent(account: Address): Paused {
  let pausedEvent = changetype<Paused>(newMockEvent())

  pausedEvent.parameters = new Array()

  pausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return pausedEvent
}

export function createRoleAdminChangedEvent(
  role: Bytes,
  previousAdminRole: Bytes,
  newAdminRole: Bytes
): RoleAdminChanged {
  let roleAdminChangedEvent = changetype<RoleAdminChanged>(newMockEvent())

  roleAdminChangedEvent.parameters = new Array()

  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      "previousAdminRole",
      ethereum.Value.fromFixedBytes(previousAdminRole)
    )
  )
  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      "newAdminRole",
      ethereum.Value.fromFixedBytes(newAdminRole)
    )
  )

  return roleAdminChangedEvent
}

export function createRoleGrantedEvent(
  role: Bytes,
  account: Address,
  sender: Address
): RoleGranted {
  let roleGrantedEvent = changetype<RoleGranted>(newMockEvent())

  roleGrantedEvent.parameters = new Array()

  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )

  return roleGrantedEvent
}

export function createRoleRevokedEvent(
  role: Bytes,
  account: Address,
  sender: Address
): RoleRevoked {
  let roleRevokedEvent = changetype<RoleRevoked>(newMockEvent())

  roleRevokedEvent.parameters = new Array()

  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )

  return roleRevokedEvent
}

export function createTokenSaleItemCreatedEvent(
  presaleAddress: Address,
  token: Address,
  tokensForSale: BigInt,
  softcap: BigInt,
  hardcap: BigInt,
  tokensPerEther: BigInt,
  minContributionEther: BigInt,
  maxContributionEther: BigInt,
  saleStartTime: BigInt,
  saleEndTime: BigInt,
  proceedsTo: Address,
  admin: Address
): TokenSaleItemCreated {
  let tokenSaleItemCreatedEvent = changetype<TokenSaleItemCreated>(
    newMockEvent()
  )

  tokenSaleItemCreatedEvent.parameters = new Array()

  tokenSaleItemCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "presaleAddress",
      ethereum.Value.fromAddress(presaleAddress)
    )
  )
  tokenSaleItemCreatedEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  tokenSaleItemCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "tokensForSale",
      ethereum.Value.fromUnsignedBigInt(tokensForSale)
    )
  )
  tokenSaleItemCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "softcap",
      ethereum.Value.fromUnsignedBigInt(softcap)
    )
  )
  tokenSaleItemCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "hardcap",
      ethereum.Value.fromUnsignedBigInt(hardcap)
    )
  )
  tokenSaleItemCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "tokensPerEther",
      ethereum.Value.fromUnsignedBigInt(tokensPerEther)
    )
  )
  tokenSaleItemCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "minContributionEther",
      ethereum.Value.fromUnsignedBigInt(minContributionEther)
    )
  )
  tokenSaleItemCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "maxContributionEther",
      ethereum.Value.fromUnsignedBigInt(maxContributionEther)
    )
  )
  tokenSaleItemCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "saleStartTime",
      ethereum.Value.fromUnsignedBigInt(saleStartTime)
    )
  )
  tokenSaleItemCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "saleEndTime",
      ethereum.Value.fromUnsignedBigInt(saleEndTime)
    )
  )
  tokenSaleItemCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "proceedsTo",
      ethereum.Value.fromAddress(proceedsTo)
    )
  )
  tokenSaleItemCreatedEvent.parameters.push(
    new ethereum.EventParam("admin", ethereum.Value.fromAddress(admin))
  )

  return tokenSaleItemCreatedEvent
}

export function createUnpausedEvent(account: Address): Unpaused {
  let unpausedEvent = changetype<Unpaused>(newMockEvent())

  unpausedEvent.parameters = new Array()

  unpausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return unpausedEvent
}
