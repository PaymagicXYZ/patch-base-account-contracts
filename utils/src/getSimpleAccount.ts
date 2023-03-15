import { SimpleAccountAPI, PaymasterAPI } from "@account-abstraction/sdk";
import { ethers } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";
import { BigNumberish, BigNumber } from "ethers";
import { BaseAccountAPI } from "@account-abstraction/sdk/dist/src/BaseAccountAPI";
import { UserOperationStruct } from "@account-abstraction/contracts";
import { SimpleAccountApiParams } from "@account-abstraction/sdk/dist/src/SimpleAccountAPI";

export interface BatchTransactionDetailsForUserOp {
  dest: string[];
  data: string[];
  gasLimit?: BigNumberish;
  maxFeePerGas?: BigNumberish;
  maxPriorityFeePerGas?: BigNumberish;
}

export class BatchAPI extends SimpleAccountAPI {
  constructor(simpleAccountApiParams: SimpleAccountApiParams) {
    super(simpleAccountApiParams);
  }

  async encodeExecuteBatch(dest: string[], data: string[]): Promise<string> {
    const accountContract = await this._getAccountContract();
    return accountContract.interface.encodeFunctionData("executeBatch", [
      dest,
      data,
    ]);
  }

  async encodeUserOpCallDataAndGasLimitBatch(
    detailsForUserOp: BatchTransactionDetailsForUserOp
  ): Promise<{ callData: string; callGasLimit: BigNumber }> {
    function parseNumber(a: any): BigNumber | null {
      if (a == null || a === "") return null;
      return BigNumber.from(a.toString());
    }

    const callData = await this.encodeExecuteBatch(
      detailsForUserOp.dest,
      detailsForUserOp.data
    );

    const callGasLimit =
      parseNumber(detailsForUserOp.gasLimit) ??
      (await this.provider.estimateGas({
        from: this.entryPointAddress,
        to: this.getAccountAddress(),
        data: callData,
      }));

    return {
      callData,
      callGasLimit,
    };
  }

  async createUnsignedUserOpBatch(
    info: BatchTransactionDetailsForUserOp
  ): Promise<UserOperationStruct> {
    const { callData, callGasLimit } =
      await this.encodeUserOpCallDataAndGasLimitBatch(info);
    const initCode = await this.getInitCode();

    const initGas = await this.estimateCreationGas(initCode);
    const verificationGasLimit = BigNumber.from(
      await this.getVerificationGasLimit()
    ).add(initGas);

    let { maxFeePerGas, maxPriorityFeePerGas } = info;
    if (maxFeePerGas == null || maxPriorityFeePerGas == null) {
      const feeData = await this.provider.getFeeData();
      if (maxFeePerGas == null) {
        maxFeePerGas = feeData.maxFeePerGas ?? undefined;
      }
      if (maxPriorityFeePerGas == null) {
        maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? undefined;
      }
    }

    const partialUserOp: any = {
      sender: this.getAccountAddress(),
      nonce: this.getNonce(),
      initCode,
      callData,
      callGasLimit,
      verificationGasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData: "0x",
    };

    let paymasterAndData: string | undefined;
    if (this.paymasterAPI != null) {
      // fill (partial) preVerificationGas (all except the cost of the generated paymasterAndData)
      const userOpForPm = {
        ...partialUserOp,
        preVerificationGas: await this.getPreVerificationGas(partialUserOp),
      };
      paymasterAndData = await this.paymasterAPI.getPaymasterAndData(
        userOpForPm
      );
    }
    partialUserOp.paymasterAndData = paymasterAndData ?? "0x";
    return {
      ...partialUserOp,
      preVerificationGas: this.getPreVerificationGas(partialUserOp),
      signature: "",
    };
  }

  async createSignedUserOpBatch(
    info: BatchTransactionDetailsForUserOp
  ): Promise<UserOperationStruct> {
    return await this.signUserOp(await this.createUnsignedUserOpBatch(info));
  }
}

export function getSimpleAccount(
  provider: JsonRpcProvider,
  signingKey: string,
  entryPointAddress: string,
  factoryAddress: string,
  accountAddress: string,
  index: number,
  paymasterAPI?: PaymasterAPI
) {
  const owner = new ethers.Wallet(signingKey, provider);
  const sw = new SimpleAccountAPI({
    provider,
    entryPointAddress,
    owner,
    factoryAddress,
    accountAddress,
    index,
  });

  // Hack: default getUserOpReceipt does not include fromBlock which causes an error for some RPC providers.
  sw.getUserOpReceipt = async (
    userOpHash: string,
    timeout = 30000,
    interval = 5000
  ): Promise<string | null> => {
    const endtime = Date.now() + timeout;
    const block = await sw.provider.getBlock("latest");
    while (Date.now() < endtime) {
      // @ts-ignore
      const events = await sw.entryPointView.queryFilter(
        // @ts-ignore
        sw.entryPointView.filters.UserOperationEvent(userOpHash),
        Math.max(0, block.number - 100)
      );
      if (events.length > 0) {
        return events[0].transactionHash;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    return null;
  };

  // console.log("sw", sw);

  return sw;
}
