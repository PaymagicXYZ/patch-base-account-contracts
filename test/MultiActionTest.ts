import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import { BaseAccountFactory, EntryPoint } from "../typechain-types";
import {
  fillAndSign,
  getBaseAccountAddress,
  getBaseAccountInitCode,
} from "../utils";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { parseEther } from "ethers/lib/utils";

describe("MultiActionTest", function () {
  async function deployWalletFixture() {
    const [owner, owner2, beneficiary] = await ethers.getSigners();

    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();

    await owner.sendTransaction({
      to: entryPoint.address,
      value: ethers.utils.parseEther("2"),
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

    await owner.sendTransaction({
      to: baseAccountAddress,
      value: ethers.utils.parseEther("2"),
    });

    const TestToken = await ethers.getContractFactory("TestToken");
    const testToken = await TestToken.deploy(
      baseAccountContract.address,
      parseEther("2.0")
    );

    return {
      owner,
      owner2,
      beneficiary,
      testToken,
      entryPoint,
      baseAccountContract,
      baseAccountFactory,
    };
  }

  describe("Create/withdraw tx", function () {
    it("Should correctly create userAccount and withdraw in 1 action", async function () {
      const {
        owner,
        owner2,
        beneficiary,
        testToken,
        entryPoint,
        baseAccountContract,
        baseAccountFactory,
      } = await loadFixture(deployWalletFixture);

      const newBaseAccountAddress = await getBaseAccountAddress(
        owner2.address,
        baseAccountFactory,
        "0xa"
      );

      const { data } = await testToken.populateTransaction.transfer(
        newBaseAccountAddress,
        parseEther("2.0")
      );

      const txExec = await baseAccountContract.populateTransaction.execute(
        testToken.address,
        0,
        data!
      );

      const baseAccountContract2 = await ethers.getContractAt<BaseAccount>(
        "BaseAccount",
        newBaseAccountAddress
      );

      const op1 = await fillAndSign(
        {
          sender: await getBaseAccountAddress(
            owner2.address,
            baseAccountFactory,
            "0xa"
          ),
          initCode: getBaseAccountInitCode(owner2.address, baseAccountFactory),
        },
        owner2,
        entryPoint
      );

      const { data: data2 } = await testToken.populateTransaction.transfer(
        owner2.address,
        parseEther("2.0")
      );

      const txExec2 = await baseAccountContract2.populateTransaction.execute(
        testToken.address,
        0,
        data2!
      );

      const op2 = await fillAndSign(
        {
          sender: owner2.address,
          nonce: 0,
          callData: txExec2.data,
        },
        owner2,
        entryPoint
      );

      const tx = await entryPoint.handleOps([op1, op2], owner.address);

      // const balanceOwner2 = await ethers.provider.getBalance(owner2.address);

      // console.log(balanceOwner2);
    });
  });
});
