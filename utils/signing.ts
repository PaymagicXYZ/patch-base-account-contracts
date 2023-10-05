import { _TypedDataEncoder, keccak256, solidityPack, toUtf8Bytes, defaultAbiCoder, BytesLike, solidityKeccak256 } from 'ethers/lib/utils';
import { OperationType } from 'ethers-multisend';
import { ecsign } from 'ethereumjs-util';
import { Contract } from 'ethers';
import { Address } from 'hardhat-deploy/types';

export const ownerPK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const convertToHash = (text: string) => {
  return keccak256(toUtf8Bytes(text));
};

const DOMAIN_SEPARATOR_SIGNATURE_HASH = convertToHash('EIP712Domain(uint256 chainId,address verifyingContract)');

const CREATE_TRANSACTION_TYPEHASH = convertToHash('CreateTransaction(address to,uint256 value,bytes data,uint8 operation)');

const getChainId = async (contract: Contract): Promise<number> => {
  return (await contract.provider.getNetwork()).chainId;
};

function getDomainSeparator(modifierAddress: Address, chainId: number): string {
  return keccak256(defaultAbiCoder.encode(['bytes32', 'uint256', 'address'], [DOMAIN_SEPARATOR_SIGNATURE_HASH, chainId, modifierAddress]));
}

async function getTransactionDigest(trustedTxModifier: Contract, to: Address, value: string, data: string, operation: OperationType, nonce: number) {
  const DOMAIN_SEPARATOR = getDomainSeparator(trustedTxModifier.address, await getChainId(trustedTxModifier));

  const msg = defaultAbiCoder.encode(
    ['bytes32', 'address', 'uint256', 'bytes', 'uint8', 'uint256'],
    [CREATE_TRANSACTION_TYPEHASH, to, value, data, operation, nonce]
  );

  const pack = solidityPack(['bytes1', 'bytes1', 'bytes32', 'bytes32'], ['0x19', '0x01', DOMAIN_SEPARATOR, keccak256(msg)]);
  return keccak256(pack);
}

export async function getSignedTransaction(
  trustedTxModifier: Contract,
  privateKey: string,
  to: Address,
  value: string,
  data: string,
  operation: OperationType,
  nonce: number
) {
  const digest = await getTransactionDigest(trustedTxModifier, to, value, data, operation, nonce);
  const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(privateKey.replace('0x', ''), 'hex'));

  const signedTransaction = { to, value, data, operation, nonce, v, r, s };

  return signedTransaction;
}

function encodeTransaction(to: Address, value: Number, data: BytesLike, operation: Number): string {
  return defaultAbiCoder.encode(['address', 'uint256', 'bytes', 'uint8'], [to, value, data, operation]);
}

export function getMessageHash(
  trustedTxModifierContract: Contract,
  functionName: string,
  nonce: Number,
  gnosisSafeAddress: Address,
  value: Number,
  data: BytesLike,
  operation: Number
): string {
  return solidityKeccak256(
    ['address', 'uint256', 'bytes4', 'bytes'],
    [
      trustedTxModifierContract.address,
      nonce,
      trustedTxModifierContract.interface.getSighash(functionName),
      encodeTransaction(gnosisSafeAddress, value, data, operation),
    ]
  );
}
