import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { base64 } from "ethers/lib/utils";
import { ethers } from "hardhat";

describe("PatchNFT", function () {
  async function deployPatchNFTFixture() {
    const [deployer, owner, recipient] = await ethers.getSigners();

    const PatchNFT = await ethers.getContractFactory("PatchNFT");
    const patchNFT = await PatchNFT.deploy(owner.address);

    return {
      deployer,
      owner,
      recipient,
      patchNFT,
    };
  }

  describe("deploy", function () {
    it("Should transfer ownership from the deployer to owner on deploy", async function () {
      const { owner, patchNFT } = await loadFixture(deployPatchNFTFixture);

      expect(await patchNFT.owner()).to.eq(owner.address);
    });
    it("Should be paused", async function () {
      const { patchNFT } = await loadFixture(deployPatchNFTFixture);

      expect(await patchNFT.paused()).to.be.true;
    });
  });
  describe("owner", function () {
    it("Should be able to unpause contract", async function () {
      const { owner, patchNFT } = await loadFixture(deployPatchNFTFixture);

      await patchNFT.connect(owner).unpause();

      expect(await patchNFT.paused()).to.be.false;
    });
    it("Should be able to mint while contract paused", async function () {
      const { owner, patchNFT, recipient } = await loadFixture(
        deployPatchNFTFixture
      );

      expect(await patchNFT.paused()).to.be.true;

      await patchNFT.connect(owner).mint(recipient.address, "twitter:a");
    });
    it("Should be able to mint while contract unpaused", async function () {
      const { owner, patchNFT, recipient } = await loadFixture(
        deployPatchNFTFixture
      );

      await patchNFT.connect(owner).unpause();

      expect(await patchNFT.paused()).to.be.false;

      await patchNFT.connect(owner).mint(recipient.address, "twitter:a");
    });
  });
  describe("recipient", function () {
    it("Shouldn't be able to transfer NFT while contract paused", async function () {
      const { patchNFT, owner, recipient } = await loadFixture(
        deployPatchNFTFixture
      );

      expect(await patchNFT.paused()).to.be.true;

      await patchNFT.connect(owner).mint(recipient.address, "twitter:a");

      await expect(
        patchNFT.connect(recipient).transfer(owner.address, 0)
      ).to.be.revertedWith("ERC721Pausable: token transfer while paused");
    });
    it("Should be able to transfer NFT while contract unpaused", async function () {
      const { patchNFT, owner, recipient } = await loadFixture(
        deployPatchNFTFixture
      );

      await patchNFT.connect(owner).unpause();

      expect(await patchNFT.paused()).to.be.false;

      await patchNFT.connect(owner).mint(recipient.address, "twitter:a");

      await patchNFT.connect(recipient).transfer(owner.address, 0);

      expect(await patchNFT.ownerOf(0)).to.eq(owner.address);
    });
  });
  describe("tokenURL", function () {
    it("Should create valid tokenURL", async function () {
      const { patchNFT, owner, recipient } = await loadFixture(
        deployPatchNFTFixture
      );

      await patchNFT.connect(owner).unpause();

      expect(await patchNFT.paused()).to.be.false;

      await patchNFT.connect(owner).mint(recipient.address, "twitter:a");

      const [encoding, payload] = await (await patchNFT.tokenURI(0)).split(",");

      expect(encoding).to.eq("data:application/json;base64");

      const metadata = JSON.parse(
        Buffer.from(base64.decode(payload)).toString()
      );

      // const metadata = Buffer.from(base64.decode(payload)).toString();
      expect(metadata.name).to.eq("Patch Wallet #0");
    });
  });
});
