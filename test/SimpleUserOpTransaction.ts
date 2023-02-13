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
    const [owner, beneficiary] = await ethers.getSigners();

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

    expect(await testToken.balanceOf(baseAccountContract.address)).to.eq(
      parseEther("2.0")
    );

    return {
      owner,
      beneficiary,
      testToken,
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
});
