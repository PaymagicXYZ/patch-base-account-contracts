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
    it("should validate with ANY data field", async () => {
      const { owner, baseAccountContract } = await loadFixture(
          deployWalletFixture
      );

      const dataOptions: Uint8Array[] = [
        ethers.utils.randomBytes(32),
        ethers.utils.arrayify("0x0000000000000000000000000000000000000000000000000000000000000000"),
        ethers.utils.arrayify("0x1010101010101010101010101010101010101010101010101010101010101010"),
        ethers.utils.arrayify("0x9999999999999999999999999999999999999999999999999999999999999999"),
        ethers.utils.arrayify("0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddead"),
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32])
    ]

      for (let i = 0; i < dataOptions.length;i++) {
        const data = dataOptions[i];
        const nonce = await baseAccountContract.getNonce();
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
      }
    });
    it("should validate WITHOUT data field", async () => {
      const { owner, baseAccountContract } = await loadFixture(
          deployWalletFixture
      );

      const nonce = await baseAccountContract.getNonce();
      const domainSeparator = await baseAccountContract.DOMAIN_SEPARATOR();

      const context = ethers.utils.arrayify(
          ethers.utils.solidityKeccak256(
              ["bytes32", "uint256"],
              [domainSeparator, nonce]
          )
      );

      const signature = await owner.signMessage(context);
      const isValid = await baseAccountContract.isValidSignatureNoData(signature);

      expect(isValid).to.equal("0x1626ba7e");
    });
    it("should not validate for incorrect nonces", async () => {
      const { owner, baseAccountContract } = await loadFixture(
        deployWalletFixture
      );

      const data = ethers.utils.randomBytes(32);
      const nonce = (await baseAccountContract.getNonce()).add(1);

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
    it("should not validate for incorrect nonces WITHOUT data field", async () => {
      const { owner, baseAccountContract } = await loadFixture(
          deployWalletFixture
      );

      const nonce = (await baseAccountContract.getNonce()).add(1);

      // Sign the data with the owner's private key
      const message = ethers.utils.arrayify(
          ethers.utils.solidityKeccak256(
              ["bytes32", "uint256"],
              [await baseAccountContract.DOMAIN_SEPARATOR(), nonce]
          )
      );
      const signature = await owner.signMessage(message);

      // Call isValidSignature on the BaseAccount contract
      const result = await baseAccountContract.isValidSignatureNoData(signature);

      // Check if the result is INVALID_SIG (0x00000000)
      expect(result).to.equal("0x00000000");
    });

    it("should not validate for incorrect base account addresses", async function () {
      const { owner, baseAccountContract, baseAccountContract2 } =
        await loadFixture(deployWalletFixture);

      const data = ethers.utils.randomBytes(32);
      const nonce = await baseAccountContract.getNonce();

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
    it("should not validate for incorrect base account addresses WITHOUT data field", async function () {
      const { owner, baseAccountContract, baseAccountContract2 } =
          await loadFixture(deployWalletFixture);

      const nonce = await baseAccountContract.getNonce();

      // Sign the data with the owner's private key
      const message = ethers.utils.arrayify(
          ethers.utils.solidityKeccak256(
              ["bytes32", "uint256"],
              [await baseAccountContract.DOMAIN_SEPARATOR(), nonce]
          )
      );
      const signature = await owner.signMessage(message);

      // Call isValidSignature on the BaseAccount contract
      const result = await baseAccountContract2.isValidSignatureNoData(signature);

      // Check if the result is INVALID_SIG (0x00000000)
      expect(result).to.equal("0x00000000");
    });
  });
});
