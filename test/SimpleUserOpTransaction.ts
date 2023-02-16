import {
  EntryPoint,
  BaseAccount,
  BaseAccountFactory,
} from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther, hexConcat, arrayify } from "ethers/lib/utils";
import { fillAndSign, getBalance } from "../utils";

let entryPoint: EntryPoint;
let wallet: BaseAccount;
let walletFactory: BaseAccountFactory;

describe("Wallet", function () {
  async function deployWalletFixture() {
    const [owner, beneficiary, random] = await ethers.getSigners();

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

    const BaseAccountFactory = await ethers.getContractFactory(
      "BaseAccountFactory"
    );
    const baseAccountFactory = await BaseAccountFactory.deploy(
      entryPoint.address
    );

    const receipt = await baseAccountFactory
      .createAccount(owner.address, "0xa")
      .then((tx: any) => tx.wait());

    const baseAccountAddress = receipt.events.find(
      ({ event }: { event: string }) => event === "BaseAccountCreated"
    ).args[0];

    const baseAccountContract = await ethers.getContractAt(
      "BaseAccount",
      baseAccountAddress
    );

    const TestToken = await ethers.getContractFactory("TestToken");
    const testToken = await TestToken.deploy(
      baseAccountContract.address,
      parseEther("2.0")
    );

    const TestToken2 = await ethers.getContractFactory("TestToken");
    const testToken2 = await TestToken.deploy(
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
      verifyingPaymaster,
      baseAccountContract,
    };
  }

  describe("Send tx", function () {
    it("Should correctly execute UserOp from Entrypoint", async function () {
      const {
        owner,
        beneficiary,
        verifyingPaymaster,
        testToken,
        entryPoint,
        baseAccountContract,
      } = await loadFixture(deployWalletFixture);

      const { data } = await testToken.populateTransaction.transfer(
        owner.address,
        parseEther("2.0")
      );

      const txExec = await baseAccountContract.populateTransaction.execute(
        testToken.address,
        0,
        data!
      );

      let op = await fillAndSign(
        {
          sender: baseAccountContract.address,
          nonce: await baseAccountContract.nonce(),
          callData: txExec.data,
        },
        owner,
        entryPoint
      );

      const hash = await verifyingPaymaster.getHash(op);
      const sig = await owner.signMessage(arrayify(hash));

      op.paymasterAndData = hexConcat([verifyingPaymaster.address, sig]);

      op = await fillAndSign(op, owner, entryPoint);

      const baseAccountBalanceBefore = await getBalance(
        baseAccountContract.address
      );

      expect(await getBalance(verifyingPaymaster.address)).to.eq(0);

      const tx = await entryPoint.handleOps([op], beneficiary.address);

      const baseAccountBalanceAfter = await getBalance(
        baseAccountContract.address
      );

      expect(baseAccountBalanceBefore).to.eq(baseAccountBalanceAfter);

      expect(await testToken.balanceOf(baseAccountContract.address)).to.eq(0);
    });
  });
  describe("Send tx multiple ERC20", function () {
    it("Should correctly executeBatch UserOp from Entrypoint", async function () {
      const {
        owner,
        beneficiary,
        verifyingPaymaster,
        testToken,
        testToken2,
        entryPoint,
        baseAccountContract,
      } = await loadFixture(deployWalletFixture);

      const { data } = await testToken.populateTransaction.transfer(
        owner.address,
        parseEther("2.0")
      );

      const { data: data2 } = await testToken2.populateTransaction.transfer(
        owner.address,
        parseEther("3.0")
      );

      const txExec = await baseAccountContract.populateTransaction.executeBatch(
        [testToken.address, testToken2.address],
        [data, data2]
      );

      let op = await fillAndSign(
        {
          sender: baseAccountContract.address,
          nonce: await baseAccountContract.nonce(),
          callData: txExec.data,
        },
        owner,
        entryPoint
      );

      const hash = await verifyingPaymaster.getHash(op);
      const sig = await owner.signMessage(arrayify(hash));

      op.paymasterAndData = hexConcat([verifyingPaymaster.address, sig]);

      op = await fillAndSign(op, owner, entryPoint);

      const baseAccountBalanceBefore = await getBalance(
        baseAccountContract.address
      );

      expect(await getBalance(verifyingPaymaster.address)).to.eq(0);

      const tx = await entryPoint.handleOps([op], beneficiary.address);

      const baseAccountBalanceAfter = await getBalance(
        baseAccountContract.address
      );

      expect(baseAccountBalanceBefore).to.eq(baseAccountBalanceAfter);

      expect(await testToken.balanceOf(baseAccountContract.address)).to.eq(0);
      expect(await testToken2.balanceOf(baseAccountContract.address)).to.eq(0);
    });
  });
  describe("Send tx multiple ERC20 and ether", function () {
    it("Should correctly executeBatch UserOp from Entrypoint", async function () {
      const {
        owner,
        beneficiary,
        random,
        verifyingPaymaster,
        testToken,
        testToken2,
        entryPoint,
        baseAccountContract,
      } = await loadFixture(deployWalletFixture);

      const { data } = await testToken.populateTransaction.transfer(
        owner.address,
        parseEther("2.0")
      );

      const { data: data2 } = await testToken2.populateTransaction.transfer(
        owner.address,
        parseEther("3.0")
      );

      //base account now has 3 ether
      await random.sendTransaction({
        to: baseAccountContract.address,
        value: parseEther("3.0"),
      });

      expect(await getBalance(baseAccountContract.address)).to.eq(
        parseEther("3.0")
      );

      const txExec =
        await baseAccountContract.populateTransaction.executeBatchValue(
          [testToken.address, testToken2.address, owner.address],
          [0, 0, parseEther("3.0")],
          [data, data2, "0x"]
        );

      let op = await fillAndSign(
        {
          sender: baseAccountContract.address,
          nonce: await baseAccountContract.nonce(),
          callData: txExec.data,
        },
        owner,
        entryPoint
      );

      const hash = await verifyingPaymaster.getHash(op);
      const sig = await owner.signMessage(arrayify(hash));

      op.paymasterAndData = hexConcat([verifyingPaymaster.address, sig]);

      op = await fillAndSign(op, owner, entryPoint);

      expect(await getBalance(verifyingPaymaster.address)).to.eq(0);

      const tx = await entryPoint.handleOps([op], beneficiary.address);

      expect(await testToken.balanceOf(baseAccountContract.address)).to.eq(0);
      expect(await testToken2.balanceOf(baseAccountContract.address)).to.eq(0);
      expect(await getBalance(baseAccountContract.address)).to.eq(0);
    });
  });
});
