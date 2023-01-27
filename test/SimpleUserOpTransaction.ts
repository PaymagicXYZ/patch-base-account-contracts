import {
  EntryPoint,
  BaseAccount,
  BaseAccountFactory,
} from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import { fillAndSign } from "../utils";

let entryPoint: EntryPoint;
let wallet: BaseAccount;
let walletFactory: BaseAccountFactory;

describe("Wallet", function () {
  async function deployWalletFixture() {
    const [owner, beneficiary] = await ethers.getSigners();

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
      beneficiary,
      testToken,
      entryPoint,
      baseAccountContract,
    };
  }

  describe("Send tx", function () {
    it("Should correctly execute UserOp from Entrypoint", async function () {
      const { owner, beneficiary, testToken, entryPoint, baseAccountContract } =
        await loadFixture(deployWalletFixture);

      const { data } = await testToken.populateTransaction.transfer(
        owner.address,
        parseEther("2.0")
      );

      const txExec = await baseAccountContract.populateTransaction.execute(
        testToken.address,
        0,
        data!
      );

      const op = await fillAndSign(
        {
          sender: baseAccountContract.address,
          nonce: await baseAccountContract.nonce(),
          callData: txExec.data,
        },
        owner,
        entryPoint
      );

      const tx = await entryPoint.handleOps([op], beneficiary.address);

      expect(await testToken.balanceOf(baseAccountContract.address)).to.eq(0);
    });
  });
});
