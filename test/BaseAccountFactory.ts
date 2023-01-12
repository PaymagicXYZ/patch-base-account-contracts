import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseAccountFactory", function () {
  async function deployBaseAccountFactoryFixture() {
    const [owner] = await ethers.getSigners();

    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();

    const BaseAccountFactory = await ethers.getContractFactory(
      "BaseAccountFactory"
    );
    const baseAccountFactory = await BaseAccountFactory.deploy(
      entryPoint.address
    );

    return {
      owner,
      baseAccountFactory,
    };
  }

  describe("createAccount", function () {
    it("Should deploy Wallet instance with the correct owner", async function () {
      const { owner, baseAccountFactory } = await loadFixture(
        deployBaseAccountFactoryFixture
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

      expect(await baseAccountContract.owner()).to.eq(owner.address);
    });
  });
});
