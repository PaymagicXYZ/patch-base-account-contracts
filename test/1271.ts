import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {_TypedDataEncoder} from "@ethersproject/hash";

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
    // it("should validate for typed data", async () => {
    //   const { owner, baseAccountContract } = await loadFixture(
    //       deployWalletFixture
    //   );
    //
    //   const domain = {
    //     "name": 'Patch Wallet',
    //     "version": '1',
    //     "chainId": 1,
    //     "verifyingContract": baseAccountContract.address as string
    //   }
    //   const types = {
    //     Person: [
    //       { name: 'name', type: 'string' },
    //       { name: 'wallet', type: 'address' }
    //     ],
    //     Mail: [
    //       { name: 'from', type: 'Person' },
    //       { name: 'to', type: 'Person' },
    //       { name: 'contents', type: 'string' }
    //     ],
    //   }
    //   const value = {
    //     from: {
    //       name: 'Cow',
    //       wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
    //     },
    //     to: {
    //       name: 'Bob',
    //       wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
    //     },
    //     contents: 'Hello, Bob!',
    //   }
    //
    //   const signature = await owner._signTypedData(domain, types, value)
    //   console.log("SIG", signature)
    //
    //   const data = ethers.utils._TypedDataEncoder.hash(domain, types, value)
    //
    //   const isValid = await baseAccountContract.isValidSignature(
    //       data,
    //       signature
    //   );
    //
    //   expect(isValid).to.equal("0x1626ba7e");
    // });

    it("should verifyMail", async () => {
      const { owner, baseAccountContract } = await loadFixture(
          deployWalletFixture
      );

      const domain = {
        "name": 'Patch Wallet',
        "version": '1',
        "chainId": 1,
        "verifyingContract": baseAccountContract.address as string
      }
      const types = {
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallet', type: 'address' }
        ],
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'to', type: 'Person' },
          { name: 'contents', type: 'string' }
        ],
      }
      const value = {
        from: {
          name: 'Cow',
          wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        },
        to: {
          name: 'Bob',
          wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        },
        contents: 'Hello, Bob!',
      }

      const signature = await owner._signTypedData(domain, types, value)
      console.log("SIG", signature)

      const data = ethers.utils._TypedDataEncoder.hash(domain, types, value)
      console.log("DATA", data)

      const isValid = await baseAccountContract.verifyMail(
          data,
          signature
      );

      expect(isValid).to.equal("0x1626ba7e");
    });

  });
});


