import {
  EntryPoint,
  BaseAccount,
  BaseAccountFactory,
  VerifyingPaymaster,
  BaseAccount__factory,
} from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { artifacts, ethers } from "hardhat";
import { parseEther, hexConcat, arrayify } from "ethers/lib/utils";
import { fillAndSign, getBalance } from "../utils";
import { getSimpleAccount } from "../utils/src";
import baseAccountABI from "../utils/baseAccountABI.json";
import { BatchAPI } from "../utils/src/getSimpleAccount";
import { getGasFee } from "../utils/src";
let entryPoint: EntryPoint;
let wallet: BaseAccount;
let walletFactory: BaseAccountFactory;

describe("Wallet", function () {
  async function deployWalletFixture() {
    const [owner, beneficiary, random, bundler] = await ethers.getSigners();

    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();

    const VerifyingPaymaster = await ethers.getContractFactory(
      "VerifyingPaymaster"
    );
    const verifyingPaymaster = await VerifyingPaymaster.deploy(
      entryPoint.address,
      owner.address
    );

    await entryPoint.depositTo(verifyingPaymaster.address, {
      value: parseEther("2"),
    });

    await entryPoint.addStake(1, { value: parseEther("2") });

    const BaseAccountFactory = await ethers.getContractFactory(
      "BaseAccountFactory"
    );
    const baseAccountFactory = await BaseAccountFactory.deploy(
      entryPoint.address
    );

    const TestToken = await ethers.getContractFactory("TestToken");

    const TestToken2 = await ethers.getContractFactory("TestToken");

    return {
      TestToken,
      TestToken2,
      baseAccountFactory,
      owner,
      beneficiary,
      random,
      bundler,
      entryPoint,
      verifyingPaymaster,
    };
  }

  describe("Send tx", function () {
    it("Should correctly execute UserOp from Entrypoint", async function () {
      const {
        owner,
        beneficiary,
        TestToken,
        verifyingPaymaster,
        baseAccountFactory,
        entryPoint,
        bundler,
      } = await loadFixture(deployWalletFixture);

      const ownerPK =
        "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

      const accountAddress = await baseAccountFactory.getAddress(
        owner.address,
        1111
      );

      const accountAPI = getSimpleAccount(
        ethers.provider,
        ownerPK,
        entryPoint.address,
        baseAccountFactory.address,
        accountAddress,
        1111
      );

      expect(accountAPI.accountAddress).to.eq(accountAddress);

      const testToken = await TestToken.deploy(
        accountAddress,
        parseEther("2.0")
      );

      let userOp = await accountAPI.createSignedUserOp({
        target: testToken.address,
        data: await testToken.interface.encodeFunctionData("transfer", [
          beneficiary.address,
          parseEther("2.0"),
        ]),
        value: 0,
      });

      userOp.callGasLimit = Number(await userOp.callGasLimit) * 3;
      userOp.preVerificationGas = Number(await userOp.preVerificationGas) * 3;
      userOp.verificationGasLimit =
        Number(await userOp.verificationGasLimit) * 3;

      let op2 = await accountAPI.signUserOp(userOp);

      const block = await ethers.provider.getBlock("latest");

      op2.paymasterAndData = hexConcat([
        verifyingPaymaster.address,
        ethers.utils.defaultAbiCoder.encode(
          ["uint48", "uint48"],
          [block.timestamp * 300, block.timestamp]
        ),
        "0x" + "00".repeat(65),
      ]);

      const hash = await verifyingPaymaster.getHash(
        op2,
        block.timestamp * 300,
        block.timestamp
      );

      const sig = await owner.signMessage(arrayify(hash));
      op2.paymasterAndData = hexConcat([
        verifyingPaymaster.address,
        ethers.utils.defaultAbiCoder.encode(
          ["uint48", "uint48"],
          [block.timestamp * 300, block.timestamp]
        ),
        sig,
      ]);

      //create payMasterAndData for the new userOp

      // console.log(op2);

      //create

      // accountAPI.paymasterAPI;

      // let op3 = await accountAPI.signUserOp(op2);

      // op2 = await ethers.utils.resolveProperties(op2);

      // // increase verification gas limit to 3x
      // //cant use mul because it is a BigNumber
      // userOp2.verificationGasLimit = Number(userOp2.verificationGasLimit) * 3;

      let userOp3 = await accountAPI.signUserOp(op2);

      // userOp3 = await ethers.utils.resolveProperties(userOp3);

      // console.log(userOp3);

      await entryPoint.connect(bundler).handleOps([userOp3], bundler.address);

      expect(await testToken.balanceOf(beneficiary.address)).to.eq(
        parseEther("2.0")
      );
    });
    it("Should correctly execute UserOp from Entrypoint", async function () {
      const {
        owner,
        beneficiary,
        TestToken,
        TestToken2,
        verifyingPaymaster,
        baseAccountFactory,
        entryPoint,
        bundler,
      } = await loadFixture(deployWalletFixture);

      const accountAddress = await baseAccountFactory.getAddress(
        owner.address,
        1112
      );

      //create accountAPI from BatchAPI
      const accountAPI = new BatchAPI({
        provider: ethers.provider,
        owner,
        entryPointAddress: entryPoint.address,
        factoryAddress: baseAccountFactory.address,
        accountAddress,
        index: 1112,
      });

      expect(accountAPI.accountAddress).to.eq(accountAddress);

      const testToken = await TestToken.deploy(
        accountAddress,
        parseEther("2.0")
      );

      const testToken2 = await TestToken2.deploy(
        accountAddress,
        parseEther("3.0")
      );

      const dest = [testToken.address, testToken2.address];

      const data = [
        testToken.interface.encodeFunctionData("transfer", [
          beneficiary.address,
          parseEther("2.0"),
        ]),
        testToken2.interface.encodeFunctionData("transfer", [
          beneficiary.address,
          parseEther("3.0"),
        ]),
      ];

      let userOp = await accountAPI.createSignedUserOpBatch({
        dest,
        data,
      });

      userOp = await ethers.utils.resolveProperties(userOp);

      // userOp.verificationGasLimit = Number(userOp.verificationGasLimit) * 3;
      userOp.callGasLimit = Number(userOp.callGasLimit) * 3;
      // userOp.preVerificationGas = Number(userOp.preVerificationGas) * 3;

      let op2 = await accountAPI.signUserOp(userOp);

      const block = await ethers.provider.getBlock("latest");

      op2.paymasterAndData = hexConcat([
        verifyingPaymaster.address,
        ethers.utils.defaultAbiCoder.encode(
          ["uint48", "uint48"],
          [block.timestamp * 300, block.timestamp]
        ),
        "0x" + "00".repeat(65),
      ]);

      const hash = await verifyingPaymaster.getHash(
        op2,
        block.timestamp * 300,
        block.timestamp
      );

      const sig = await owner.signMessage(arrayify(hash));
      op2.paymasterAndData = hexConcat([
        verifyingPaymaster.address,
        ethers.utils.defaultAbiCoder.encode(
          ["uint48", "uint48"],
          [block.timestamp * 300, block.timestamp]
        ),
        sig,
      ]);

      //create payMasterAndData for the new userOp

      // console.log(op2);

      //create

      // accountAPI.paymasterAPI;

      // let op3 = await accountAPI.signUserOp(op2);

      // op2.

      let userOp3 = await accountAPI.signUserOp(op2);

      userOp3 = await ethers.utils.resolveProperties(userOp3);

      // console.log("userOp3", userOp3);

      // console.log(userOp3);

      await entryPoint.connect(bundler).handleOps([userOp3], bundler.address);

      // expect(await testToken.balanceOf(beneficiary.address)).to.eq(
      //   parseEther("2.0")
      // );
    });
  });
});
