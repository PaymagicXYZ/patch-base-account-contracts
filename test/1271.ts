import {
  EntryPoint,
  BaseAccount,
  BaseAccountFactory,
} from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  _HASHED_NAME,
  createHashMessage,
  getDigest,
  getDomainSeparator,
} from "../utils/1271";

describe("1271", function () {
  async function deployWalletFixture() {
    const [owner, beneficiary] = await ethers.getSigners();

    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();

    await owner.sendTransaction({
      to: entryPoint.address,
      value: ethers.utils.parseEther("2"),
    });

    const BaseAccountFactory = await ethers.getContractFactory(
      "BaseAccountFactory2"
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
      "BaseAccount2",
      baseAccountAddress
    );

    return {
      owner,
      beneficiary,
      entryPoint,
      baseAccountContract,
    };
  }

  describe("isValidSignature", function () {
    it("Should correctly verify valid signature", async function () {
      const { owner, beneficiary, entryPoint, baseAccountContract } =
        await loadFixture(deployWalletFixture);

      const { chainId } = await ethers.provider.network;

      expect(await baseAccountContract.DOMAIN_SEPARATOR()).to.eq(
        getDomainSeparator(baseAccountContract.address, chainId)
      );

      const message = createHashMessage(["string"], ["hello"]);

      const digest = getDigest(baseAccountContract.address, message, chainId);

      const signature = owner.signMessage(digest);

      console.log(
        await baseAccountContract.isValidSignature(digest, signature)
      );
    });
  });
});
