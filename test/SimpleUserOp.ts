import {
  EntryPoint__factory,
  BaseAccount,
  BaseAccountFactory__factory,
  VerifyingPaymaster__factory,
  TestERC20,
} from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther, hexConcat, arrayify } from "ethers/lib/utils";
import { fillAndSign, signUserOp } from "../utils";
import { encoder } from "../utils";
import { UserOperation } from "../types";
import { calcPreVerificationGas } from "@account-abstraction/sdk";
import { BigNumberish } from "ethers";

// Known private key of the first signer in the Hardhat node
const privateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

describe("Wallet", function () {
  async function deployWalletFixture() {
    const [owner, beneficiary, random] = await ethers.getSigners();

    const EntryPoint = new EntryPoint__factory(owner);
    const entryPoint = await EntryPoint.deploy();

    const VerifyingPaymaster = new VerifyingPaymaster__factory(owner);
    const verifyingPaymaster = await VerifyingPaymaster.deploy(
      entryPoint.address,
      owner.address
    );

    await entryPoint.depositTo(verifyingPaymaster.address, {
      value: parseEther("3"),
    });

    const BaseAccountFactory = new BaseAccountFactory__factory(owner);
    const baseAccountFactory = await BaseAccountFactory.deploy(
      entryPoint.address
    );

    const receipt = await baseAccountFactory
      .createAccount(owner.address, "0xa")
      .then((tx: any) => tx.wait());

    const baseAccountAddress = receipt.events.find(
      ({ event }: { event: string }) => event === "BaseAccountCreated"
    ).args[0];

    const baseAccountContract: BaseAccount = await ethers.getContractAt(
      "BaseAccount",
      baseAccountAddress
    );

    const TestToken = await ethers.getContractFactory("TestERC20");
    const testToken = await TestToken.deploy(
      baseAccountContract.address,
      parseEther("2.0")
    );

    const TestToken2 = await ethers.getContractFactory("TestERC20");
    const testToken2 = await TestToken2.deploy(
      baseAccountContract.address,
      parseEther("3.0")
    );

    expect(await testToken.balanceOf(baseAccountContract.address)).to.eq(
      parseEther("2.0")
    );

    expect(await testToken2.balanceOf(baseAccountContract.address)).to.eq(
      parseEther("3.0")
    );

    return {
      owner,
      beneficiary,
      random,
      testToken,
      testToken2,
      entryPoint,
      baseAccountFactory,
      verifyingPaymaster,
      baseAccountContract,
    };
  }

  describe("Send tx", function () {
    it("Should correctly execute UserOp from Entrypoint", async function () {
      const { owner, testToken, entryPoint, baseAccountContract } =
        await loadFixture(deployWalletFixture);

      await owner.sendTransaction({
        to: baseAccountContract.address,
        value: parseEther("1"),
      });

      let callData = testToken.interface.encodeFunctionData("transfer", [
        owner.address,
        parseEther("2.0"),
      ]);

      callData = await baseAccountContract.interface.encodeFunctionData(
        "execute",
        [testToken.address, 0, callData]
      );

      const callGasLimit = 200000;
      const verificationGasLimit = 100000;
      const maxFeePerGas = 3e9;

      let userOp = await fillAndSign(
        {
          sender: baseAccountContract.address,
          callData,
          callGasLimit,
          verificationGasLimit,
          maxFeePerGas,
        },
        owner,
        entryPoint,
        "getNonce"
      );

      await entryPoint.handleOps([userOp], owner.address);

      expect(await testToken.balanceOf(baseAccountContract.address)).to.eq(0);
    });
    it("Should correctly execute UserOp from Entrypoint with paymaster", async function () {
      const {
        owner,
        verifyingPaymaster,
        testToken,
        entryPoint,
        baseAccountContract,
      } = await loadFixture(deployWalletFixture);

      let callData = testToken.interface.encodeFunctionData("transfer", [
        owner.address,
        parseEther("2.0"),
      ]);

      callData = await baseAccountContract.interface.encodeFunctionData(
        "execute",
        [testToken.address, 0, callData]
      );

      const callGasLimit = 200000;
      const verificationGasLimit = 100000;
      const maxFeePerGas = 3e9;

      let userOp = await fillAndSign(
        {
          sender: baseAccountContract.address,
          callData,
          callGasLimit,
          verificationGasLimit,
          maxFeePerGas,
        },
        owner,
        entryPoint,
        "getNonce"
      );

      const validAfter =
        (await ethers.provider.getBlock("latest")).timestamp - 1;
      const validUntil =
        (await ethers.provider.getBlock("latest")).timestamp + 86400;

      let pmOp: UserOperation = {
        ...userOp,
        paymasterAndData: hexConcat([
          verifyingPaymaster.address,
          encoder(validUntil, validAfter),
          "0x" + "00".repeat(65),
        ]),
      };

      pmOp = await fillAndSign(
        {
          sender: baseAccountContract.address,
          callData,
          paymasterAndData: pmOp.paymasterAndData,
        },
        owner,
        entryPoint,
        "getNonce"
      );

      const wallet = new ethers.Wallet(privateKey);

      const hash = await verifyingPaymaster.getHash(
        pmOp,
        validUntil,
        validAfter
      );
      const sig = await wallet.signMessage(arrayify(hash));
      pmOp.paymasterAndData = hexConcat([
        verifyingPaymaster.address,
        encoder(validUntil, validAfter),
        sig,
      ]);

      pmOp = await fillAndSign(
        {
          sender: baseAccountContract.address,
          callData,
          paymasterAndData: pmOp.paymasterAndData,
        },
        owner,
        entryPoint,
        "getNonce"
      );

      await entryPoint.handleOps([pmOp], owner.address);

      expect(await testToken.balanceOf(baseAccountContract.address)).to.eq(0);
    });
  });
});
