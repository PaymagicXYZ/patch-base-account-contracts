import { BytesLike } from "ethers";
import {
  _TypedDataEncoder,
  keccak256,
  solidityPack,
  toUtf8Bytes,
  defaultAbiCoder,
} from "ethers/lib/utils";
import { Address } from "hardhat-deploy/types";

const convertToHash = (text: string) => {
  return keccak256(toUtf8Bytes(text));
};

export const _HASHED_NAME = convertToHash("Patch Wallet");

const DOMAIN_SEPARATOR_SIGNATURE_HASH = convertToHash(
  "EIP712Domain(string name,uint256 chainId,address verifyingContract)"
);

export function getDomainSeparator(
  verifyingAddress: Address,
  chainId: number
): string {
  return keccak256(
    defaultAbiCoder.encode(
      ["bytes32", "bytes32", "uint256", "address"],
      [_HASHED_NAME, DOMAIN_SEPARATOR_SIGNATURE_HASH, chainId, verifyingAddress]
    )
  );
}

export function createHashMessage(types: string[], values: any[]) {
  return keccak256(defaultAbiCoder.encode(types, values));
}

export function getDigest(
  verifyingAddress: Address,
  hashedTypedData: BytesLike,
  chainId: number
) {
  const DOMAIN_SEPARATOR = getDomainSeparator(verifyingAddress, chainId);

  const pack = solidityPack(
    ["bytes1", "bytes1", "bytes32", "bytes32"],
    ["0x19", "0x01", DOMAIN_SEPARATOR, hashedTypedData]
  );
  return keccak256(pack);
}
