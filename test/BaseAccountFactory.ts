import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import { BaseAccountFactory, EntryPoint } from "../typechain-types";

describe("BaseAccountFactory", function () {
  async function deployBaseAccountFactoryFixture() {
    const [owner] = await ethers.getSigners();

    await deployments.fixture(["BaseAccountFactory"]);

    const baseAccountFactory = await ethers.getContract<BaseAccountFactory>(
      "BaseAccountFactory"
    );

    return {
      owner,
      baseAccountFactory,
    };
  }

  describe("createAccount", function () {
    it("Should deploy Wallet instance with the correct owner", async function () {
      const { owner, baseAccountFactory } =
        await deployBaseAccountFactoryFixture();
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

      expect(
        await baseAccountFactory.callStatic.createAccount(owner.address, "0xa")
      ).to.eq(baseAccountAddress);
    });
    it("getAddress() should predict correct address", async function () {
      const { owner, baseAccountFactory } =
        await await deployBaseAccountFactoryFixture();

      const predictedAddress = await baseAccountFactory.getAddress(
        owner.address,
        "0xa"
      );

      const receipt = await baseAccountFactory
        .createAccount(owner.address, "0xa")
        .then((tx: any) => tx.wait());

      const baseAccountAddress = receipt.events.find(
        ({ event }: { event: string }) => event === "BaseAccountCreated"
      ).args[0];

      expect(predictedAddress).to.eq(baseAccountAddress);
    });
  });
});
