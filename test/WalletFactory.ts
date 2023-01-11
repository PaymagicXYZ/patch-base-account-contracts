import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet", function () {
  async function deployWalletFixture() {
    const [owner] = await ethers.getSigners();

    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();

    const WalletFactory = await ethers.getContractFactory("WalletFactory");
    const walletFactory = await WalletFactory.deploy(entryPoint.address);

    return {
      owner,
      walletFactory,
    };
  }

  describe("createAccount", function () {
    it("Should deploy account with the correct owner", async function () {
      const { owner, walletFactory } = await loadFixture(deployWalletFixture);

      const receipt = await walletFactory
        .createAccount(owner.address, "0xa")
        .then((tx: any) => tx.wait());

      const walletAddress = receipt.events.find(
        ({ event }: { event: string }) => event === "WalletCreated"
      ).args[0];

      const walletContract = await ethers.getContractAt(
        "Wallet",
        walletAddress
      );

      expect(await walletContract.owner()).to.eq(owner.address);
    });
  });
});
