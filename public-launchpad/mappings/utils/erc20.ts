import { Address, BigInt } from "@graphprotocol/graph-ts";
import { ERC20 } from "../../generated/PublicTokenSaleCreator/ERC20";

export const fetchTokenName = (id: Address): string => {
  const contract = ERC20.bind(id);
  const call = contract.try_name();

  return !call.reverted ? call.value : "unknown";
};

export const fetchTokenSymbol = (id: Address): string => {
  const contract = ERC20.bind(id);
  const call = contract.try_symbol();

  return !call.reverted ? call.value : "unknown";
};

export const fetchTokenDecimals = (id: Address): BigInt | null => {
  const contract = ERC20.bind(id);
  const call = contract.try_decimals();

  return !call.reverted ? BigInt.fromI32(call.value) : null;
};

export const fetchTokenTotalSupply = (id: Address): BigInt | null => {
  const contract = ERC20.bind(id);
  const call = contract.try_totalSupply();

  return !call.reverted ? call.value : null;
};
