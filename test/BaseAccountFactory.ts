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
      entryPoint,
      baseAccountFactory,
    };
  }

  describe("createAccount", function () {
    it("Should deploy Wallet instance with the correct owner and entrypoint", async function () {
      const { owner, baseAccountFactory, entryPoint } =
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

      expect(await baseAccountContract.entryPoint()).to.eq(entryPoint.address);

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
