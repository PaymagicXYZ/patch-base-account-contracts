"use strict";

import * as typ from "./solidityTypes";
import { getAddress } from "@ethersproject/address";
import { Provider, TransactionRequest } from "@ethersproject/abstract-provider";
import {
  ExternallyOwnedAccount,
  Signer,
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner,
} from "@ethersproject/abstract-signer";
import {
  arrayify,
  Bytes,
  BytesLike,
  concat,
  hexDataSlice,
  isHexString,
  joinSignature,
  SignatureLike,
} from "@ethersproject/bytes";
import { hashMessage, _TypedDataEncoder } from "@ethersproject/hash";
import {
  defaultPath,
  HDNode,
  entropyToMnemonic,
  Mnemonic,
} from "@ethersproject/hdnode";
import { keccak256 } from "@ethersproject/keccak256";
import { defineReadOnly, resolveProperties } from "@ethersproject/properties";
import { randomBytes } from "@ethersproject/random";
import { SigningKey } from "@ethersproject/signing-key";
import {
  decryptJsonWallet,
  decryptJsonWalletSync,
  encryptKeystore,
  ProgressCallback,
} from "@ethersproject/json-wallets";
import {
  computeAddress,
  recoverAddress,
  serialize,
  UnsignedTransaction,
} from "@ethersproject/transactions";
import { Wordlist } from "@ethersproject/wordlists";

export interface UserOperation {
  sender: typ.address;
  nonce: typ.uint256;
  initCode: typ.bytes;
  callData: typ.bytes;
  callGasLimit: typ.uint256;
  verificationGasLimit: typ.uint256;
  preVerificationGas: typ.uint256;
  maxFeePerGas: typ.uint256;
  maxPriorityFeePerGas: typ.uint256;
  paymasterAndData: typ.bytes;
  signature: typ.bytes;
}

import { Logger } from "@ethersproject/logger";
// import { version } from "./_version";
// const logger = new Logger(version);

function isAccount(value: any): value is ExternallyOwnedAccount {
  return (
    value != null && isHexString(value.privateKey, 32) && value.address != null
  );
}

function hasMnemonic(value: any): value is { mnemonic: Mnemonic } {
  const mnemonic = value.mnemonic;
  return mnemonic && mnemonic.phrase;
}

export function verifyMessage(
  message: Bytes | string,
  signature: SignatureLike
): string {
  return recoverAddress(hashMessage(message), signature);
}

export function verifyTypedData(
  domain: TypedDataDomain,
  types: Record<string, Array<TypedDataField>>,
  value: Record<string, any>,
  signature: SignatureLike
): string {
  return recoverAddress(
    _TypedDataEncoder.hash(domain, types, value),
    signature
  );
}
