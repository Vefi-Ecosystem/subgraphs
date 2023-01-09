import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  OwnershipTransferred as OwnershipTransferredEvent,
  Paused as PausedEvent,
  RoleAdminChanged as RoleAdminChangedEvent,
  RoleGranted as RoleGrantedEvent,
  RoleRevoked as RoleRevokedEvent,
  TokenSaleItemCreated as TokenSaleItemCreatedEvent,
  Unpaused as UnpausedEvent,
} from "../generated/PublicTokenSaleCreator/PublicTokenSaleCreator";
import { Launch, Token } from "../generated/schema";
import { fetchTokenDecimals, fetchTokenName, fetchTokenSymbol, fetchTokenTotalSupply } from "./utils/erc20";
import { convertTokenToDecimal } from "./utils";

export function handleTokenSaleItemCreated(event: TokenSaleItemCreatedEvent): void {
  const launch = new Launch(event.params.presaleAddress.toHex());

  let token = Token.load(event.params.token.toHex());

  if (!token || token === null) {
    token = new Token(event.params.token.toHex());

    token.name = fetchTokenName(event.params.token);
    token.symbol = fetchTokenSymbol(event.params.token);

    const decimals = fetchTokenDecimals(event.params.token);

    if (decimals === null) {
      log.debug("could not obtain token decimals", []);
      return;
    }

    token.decimals = decimals;

    const totalSupply = fetchTokenTotalSupply(event.params.token);

    if (totalSupply === null) {
      log.debug("could not obtain token total supply", []);
      return;
    }

    token.totalSupply = totalSupply;
    token.save();
  }

  launch.presaleAddress = event.params.presaleAddress.toHex();
  launch.token = token.id;
  launch.tokensForSale = convertTokenToDecimal(event.params.tokensForSale, token.decimals);
  launch.softcap = convertTokenToDecimal(event.params.softcap, BigInt.fromI32(18));
  launch.hardcap = convertTokenToDecimal(event.params.hardcap, BigInt.fromI32(18));
  launch.tokensPerEther = convertTokenToDecimal(event.params.tokensPerEther, BigInt.fromI32(18));
  launch.minContributionEther = convertTokenToDecimal(event.params.minContributionEther, BigInt.fromI32(18));
  launch.maxContributionEther = convertTokenToDecimal(event.params.maxContributionEther, BigInt.fromI32(18));
  launch.saleStartTime = event.params.saleStartTime;
  launch.saleEndTime = event.params.saleEndTime;
  launch.proceedsTo = event.params.proceedsTo.toHex();
  launch.admin = event.params.admin.toHex();

  launch.save();
}
