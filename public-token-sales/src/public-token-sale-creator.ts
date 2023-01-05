import {
  OwnershipTransferred as OwnershipTransferredEvent,
  Paused as PausedEvent,
  RoleAdminChanged as RoleAdminChangedEvent,
  RoleGranted as RoleGrantedEvent,
  RoleRevoked as RoleRevokedEvent,
  TokenSaleItemCreated as TokenSaleItemCreatedEvent,
  Unpaused as UnpausedEvent
} from "../generated/PublicTokenSaleCreator/PublicTokenSaleCreator"
import {
  TokenSaleItem,
} from "../generated/schema"

export function handleTokenSaleItemCreated(
  event: TokenSaleItemCreatedEvent
): void {
  const entity = new TokenSaleItem(
    event.params.presaleAddress.toHex()
  )
  entity.presaleAddress = event.params.presaleAddress.toHex();
  entity.token = event.params.token.toHex()
  entity.tokensForSale = event.params.tokensForSale
  entity.softcap = event.params.softcap
  entity.hardcap = event.params.hardcap
  entity.tokensPerEther = event.params.tokensPerEther
  entity.minContributionEther = event.params.minContributionEther
  entity.maxContributionEther = event.params.maxContributionEther
  entity.saleStartTime = event.params.saleStartTime
  entity.saleEndTime = event.params.saleEndTime
  entity.proceedsTo = event.params.proceedsTo.toHex()
  entity.admin = event.params.admin.toHex()

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash.toHex();

  entity.save()
}
