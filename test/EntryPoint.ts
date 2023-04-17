import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("EntryPoint", function () {
  async function deployWalletFixture() {
    const [owner, other] = await ethers.getSigners();

    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();

    const entryPoint2 = await EntryPoint.deploy();

    expect(entryPoint.address).to.not.equal(entryPoint2.address);

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

    return {
      baseAccountFactory,
      owner,
      other,
      entryPoint,
      entryPoint2,
      baseAccountContract,
    };
  }

  describe("changeEntryPoint", function () {
    it("should change the entry point if called by owner", async function () {
      const { entryPoint2, baseAccountContract } = await loadFixture(
        deployWalletFixture
      );

      await baseAccountContract.changeEntryPoint(entryPoint2.address);

      expect(await baseAccountContract.entryPoint()).to.equal(
        entryPoint2.address
      );
    });
    it("should not change the entry point if not called by owner", async function () {
      const { entryPoint2, baseAccountContract, other } = await loadFixture(
        deployWalletFixture
      );

      expect(
        baseAccountContract.connect(other).changeEntryPoint(entryPoint2.address)
      ).to.be.rejectedWith("account: not Owner or EntryPoint");
    });
  });
});
