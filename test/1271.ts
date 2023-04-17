import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { _HASHED_NAME } from "../utils/1271";

describe("1271", function () {
  async function deployWalletFixture() {
    const [owner] = await ethers.getSigners();

    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();

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

    const receipt2 = await baseAccountFactory
      .createAccount(owner.address, "0xaB")
      .then((tx: any) => tx.wait());

    const baseAccountAddress2 = receipt2.events.find(
      ({ event }: { event: string }) => event === "BaseAccountCreated"
    ).args[0];

    const baseAccountContract2 = await ethers.getContractAt(
      "BaseAccount",
      baseAccountAddress2
    );

    return {
      baseAccountFactory,
      owner,
      entryPoint,
      baseAccountContract,
      baseAccountContract2,
    };
  }

  describe("isValidSignature", function () {
    it("should validate for correct nonces and base account addresses", async () => {
      const { owner, baseAccountContract } = await loadFixture(
        deployWalletFixture
      );

      const data = ethers.utils.randomBytes(32);
      const nonce = await baseAccountContract.nonce();
      const domainSeparator = await baseAccountContract.DOMAIN_SEPARATOR();

      const context = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["bytes32", "uint256", "bytes32"],
          [domainSeparator, nonce, data]
        )
      );

      const signature = await owner.signMessage(context);
      const isValid = await baseAccountContract.isValidSignature(
        data,
        signature
      );

      expect(isValid).to.equal("0x1626ba7e");
    });
    it("should not validate for incorrect nonces", async () => {
      const { owner, baseAccountContract } = await loadFixture(
        deployWalletFixture
      );

      const data = ethers.utils.randomBytes(32);
      const nonce = (await baseAccountContract.nonce()).add(1);

      // Sign the data with the owner's private key
      const message = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["bytes32", "uint256", "bytes32"],
          [await baseAccountContract.DOMAIN_SEPARATOR(), nonce, data]
        )
      );
      const signature = await owner.signMessage(message);

      // Call isValidSignature on the BaseAccount contract
      const result = await baseAccountContract.isValidSignature(
        data,
        signature
      );

      // Check if the result is INVALID_SIG (0x00000000)
      expect(result).to.equal("0x00000000");
    });

    it("should not validate for incorrect base account addresses", async function () {
      const { owner, baseAccountContract, baseAccountContract2 } =
        await loadFixture(deployWalletFixture);

      const data = ethers.utils.randomBytes(32);
      const nonce = (await baseAccountContract.nonce()).add(1);

      // Sign the data with the owner's private key
      const message = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ["bytes32", "uint256", "bytes32"],
          [await baseAccountContract.DOMAIN_SEPARATOR(), nonce, data]
        )
      );
      const signature = await owner.signMessage(message);

      // Call isValidSignature on the BaseAccount contract
      const result = await baseAccountContract2.isValidSignature(
        data,
        signature
      );

      // Check if the result is INVALID_SIG (0x00000000)
      expect(result).to.equal("0x00000000");
    });
  });
});
