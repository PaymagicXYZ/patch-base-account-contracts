import { BaseAccount } from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import { getBalance } from "../utils";
import { Signer } from "ethers";
import { BatchAPI } from "../utils/src";
import { abi as BaseAccountAbi } from "../artifacts/contracts/BaseAccount.sol/BaseAccount.json";
import { BigNumber } from "ethers";
import { BytesLike } from "ethers/lib/utils";

describe("ERC1967 Upgradability", function () {
  async function deployWalletFixture() {
    const [owner, beneficiary, random] = await ethers.getSigners();

    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();

    const VerifyingPaymaster = await ethers.getContractFactory(
      "VerifyingPaymaster"
    );
    const verifyingPaymaster = await VerifyingPaymaster.deploy(
      entryPoint.address,
      owner.address
    );

    await entryPoint.depositTo(verifyingPaymaster.address, {
      value: parseEther("2"),
    });

    const BaseAccountFactoryNew = await ethers.getContractFactory(
      "BaseAccountFactoryNew"
    );
    const baseAccountFactoryNew = await BaseAccountFactoryNew.deploy(
      entryPoint.address
    );

    const BaseAccountFactoryOld = await ethers.getContractFactory(
      "BaseAccountFactoryOld"
    );
    const baseAccountFactoryOld = await BaseAccountFactoryOld.deploy(
      entryPoint.address
    );

    const receiptOld = await baseAccountFactoryOld
      .createAccount(owner.address, "0xa")
      .then((tx: any) => tx.wait());

    const baseAccountOldAddress = receiptOld.events.find(
      ({ event }: { event: string }) => event === "BaseAccountOldCreated"
    ).args[0];

    const baseAccountOldContract = await ethers.getContractAt(
      "BaseAccountOld",
      baseAccountOldAddress
    );

    const receiptOld2 = await baseAccountFactoryOld
      .createAccount(owner.address, "0xab")
      .then((tx: any) => tx.wait());

    const baseAccountOldAddress2 = receiptOld2.events.find(
      ({ event }: { event: string }) => event === "BaseAccountOldCreated"
    ).args[0];

    const baseAccountOldContract2 = await ethers.getContractAt(
      "BaseAccountOld",
      baseAccountOldAddress2
    );

    const receiptOld3 = await baseAccountFactoryOld
      .createAccount(owner.address, "0xabc")
      .then((tx: any) => tx.wait());

    const baseAccountOldAddress3 = receiptOld3.events.find(
      ({ event }: { event: string }) => event === "BaseAccountOldCreated"
    ).args[0];

    const baseAccountOldContract3 = await ethers.getContractAt(
      "BaseAccountOld",
      baseAccountOldAddress3
    );

    return {
      owner,
      beneficiary,
      random,
      entryPoint,
      verifyingPaymaster,
      baseAccountFactoryNew,
      baseAccountFactoryOld,
      baseAccountOldContract,
      baseAccountOldContract2,
      baseAccountOldContract3,
    };
  }

  describe("Send tx", function () {
    it("Should correctly deploy contracts and initialize variables", async function () {
      const {
        owner,
        beneficiary,
        verifyingPaymaster,
        // baseAccount,
        // baseAccountFactory,
        baseAccountFactoryNew,
        baseAccountFactoryOld,
        entryPoint,
        baseAccountOldContract,
        // baseAccountContract,
      } = await loadFixture(deployWalletFixture);
      // Check if the owner of the base account is set correctly
      expect(await baseAccountOldContract.owner()).to.equal(owner.address);

      // Check if the entryPoint for the base account is set correctly
      expect(await baseAccountOldContract.entryPoint()).to.equal(
        entryPoint.address
      );

      // Check if the entryPoint has the expected balance
      expect(await getBalance(entryPoint.address)).to.equal(parseEther("2"));
    });
    it("Should emit correct events during upgrade", async function () {
      const { baseAccountOldContract, baseAccountFactoryNew } =
        await loadFixture(deployWalletFixture);

      // Perform the upgrade and capture the events
      const tx = await baseAccountOldContract.upgradeTo(
        await baseAccountFactoryNew.baseAccountImpl()
      );
      const receipt = await tx.wait();

      // Check if the correct events were emitted during the upgrade process
      expect(receipt.events).to.satisfy((events: any[]) =>
        events.some((event: any) => event.event === "Upgraded")
      );
    });
    it("Should only allow owner to perform the upgrade", async function () {
      const { owner, random, baseAccountOldContract, baseAccountFactoryNew } =
        await loadFixture(deployWalletFixture);

      // Try to perform the upgrade as a non-owner
      await expect(
        baseAccountOldContract
          .connect(random)
          .upgradeTo(await baseAccountFactoryNew.baseAccountImpl())
      ).to.be.revertedWith("only owner");

      // Perform the upgrade as the owner
      await baseAccountOldContract
        .connect(owner)
        .upgradeTo(await baseAccountFactoryNew.baseAccountImpl());
    });
    it("Should have correct functionality after upgrade", async function () {
      const {
        owner,
        baseAccountFactoryNew,
        baseAccountFactoryOld,
        entryPoint,
        baseAccountOldContract,
      } = await loadFixture(deployWalletFixture);
      const baseAccountImplContract = await ethers.getContractAt<BaseAccount>(
        "BaseAccountOld",
        await baseAccountFactoryOld.baseAccountImpl()
      );

      const tx = await baseAccountOldContract.upgradeTo(
        await baseAccountFactoryNew.baseAccountImpl()
      );
      // // After the upgradeToAndCall function call
      const upgradedBaseAccount = await ethers.getContractAt(
        "BaseAccountNew",
        baseAccountOldContract.address
      );
      expect(await upgradedBaseAccount.owner()).to.equal(owner.address);
      expect(await upgradedBaseAccount.entryPoint()).to.equal(
        entryPoint.address
      );
      expect(await upgradedBaseAccount.DOMAIN_SEPARATOR()).to.not.equal(
        await baseAccountImplContract.DOMAIN_SEPARATOR()
      );
    });
    it("Should preserve storage slots after upgrade", async function () {
      const {
        baseAccountOldContract,
        baseAccountOldContract2,
        baseAccountOldContract3,
        baseAccountFactoryNew,
        entryPoint,
        owner,
      } = await loadFixture(deployWalletFixture);

      const baseAccountAddresses = [
        baseAccountOldContract.address,
        baseAccountOldContract2.address,
        baseAccountOldContract3.address,
      ];

      const newImplementationAddress =
        await baseAccountFactoryNew.baseAccountImpl();

      const upgradeToData = baseAccountAddresses.map((address) => {
        const data = baseAccountOldContract.interface.encodeFunctionData(
          "upgradeTo",
          [newImplementationAddress]
        );
        return { target: address, allowFailure: false, callData: data };
      });

      // const tx = await multicall3.aggregate3(upgradeToData);

      await baseAccountOldContract.upgradeTo(newImplementationAddress);
      await baseAccountOldContract2.upgradeTo(newImplementationAddress);
      await baseAccountOldContract3.upgradeTo(newImplementationAddress);

      // async function upgradeBaseAccountsWithMulticallProvider(
      //   baseAccounts: string[],
      //   baseAccountImplementationAddress: string
      // ) {
      //   const txs = [];
      //   const multicallProvider = new providers.MulticallProvider(
      //     ethers.provider
      //   );

      //   const signer = new ethers.Wallet(
      //     "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      //     multicallProvider
      //   );
      // baseAccounts.map(async (baseAccount) => {

      //   for (let i = 0; i < baseAccounts.length; i++) {
      //     const baseAccountContract = await ethers.getContractAt(
      //       "BaseAccountNew",
      //       baseAccounts[i],
      //       signer
      //     );

      //     //create upgradeTo call with correct nonce

      //     txs.push(
      //       baseAccountContract.upgradeTo(baseAccountImplementationAddress)
      //     );
      //   }

      //   await Promise.all(txs);
      // }

      // await upgradeBaseAccountsWithMulticallProvider(
      //   baseAccountAddresses,
      //   newImplementationAddress
      // );

      for (let i = 0; i < baseAccountAddresses.length; i++) {
        const upgradedBaseAccount = await ethers.getContractAt(
          "BaseAccountNew",
          baseAccountAddresses[i]
        );
        expect(await upgradedBaseAccount.entryPoint()).to.equal(
          entryPoint.address
        );
        expect(await upgradedBaseAccount.owner()).to.equal(owner.address);

        const implementationAtSlot = await ethers.provider.getStorageAt(
          upgradedBaseAccount.address,
          "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
        );

        const implementationAddress = ethers.utils.defaultAbiCoder.decode(
          ["address"],
          implementationAtSlot
        )[0];

        expect(implementationAddress).to.eq(newImplementationAddress);
      }
    });
  });
  describe("UserOps", function () {
    it("Should correctly batch upgrade the contracts", async function () {
      const {
        beneficiary,
        baseAccountFactoryNew,
        baseAccountFactoryOld,
        entryPoint,
        baseAccountOldContract,
        baseAccountOldContract2,
        baseAccountOldContract3,
      } = await loadFixture(deployWalletFixture);

      interface Pairing {
        baseAccountAddress: string;
        userId: BytesLike;
      }

      async function formUpgradeUserOps(
        baseAccount: Pairing,
        newImplementationAddress: string,
        baseAccountFactoryOldAddress: string,
        signer: Signer
      ) {
        const accountAPI = new BatchAPI({
          provider: ethers.provider,
          owner: signer,
          entryPointAddress: entryPoint.address,
          factoryAddress: baseAccountFactoryOldAddress,
          accountAddress: baseAccount.baseAccountAddress,
          index: baseAccount.userId,
        });

        const baseAccountOldContractInterface = new ethers.utils.Interface(
          BaseAccountAbi
        );

        const data = baseAccountOldContractInterface.encodeFunctionData(
          "upgradeTo",
          [newImplementationAddress]
        );

        let userOp = await accountAPI.createUnsignedUserOp({
          target: baseAccount.baseAccountAddress,
          data,
        });

        userOp.maxFeePerGas = BigNumber.from(0);

        userOp = await accountAPI.signUserOp(userOp);

        return userOp;
      }

      const newImplementationAddress =
        await baseAccountFactoryNew.baseAccountImpl();

      let signer = new ethers.Wallet(
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        ethers.provider
      );

      async function formUpgradeUserOpsBatch(
        baseAccounts: Pairing[],
        newImplementationAddress: string,
        baseAccountFactoryOldAddress: string,
        signer: Signer
      ) {
        const userOps = await Promise.all(
          baseAccounts.map((baseAccount) =>
            formUpgradeUserOps(
              baseAccount,
              newImplementationAddress,
              baseAccountFactoryOldAddress,
              signer
            )
          )
        );

        return userOps;
      }

      const baseAccountPairs = [
        { baseAccountAddress: baseAccountOldContract.address, userId: "0xa" },
        {
          baseAccountAddress: baseAccountOldContract2.address,
          userId: "0xab",
        },
        {
          baseAccountAddress: baseAccountOldContract3.address,
          userId: "0xabc",
        },
      ];

      const userOps = await formUpgradeUserOpsBatch(
        baseAccountPairs,
        newImplementationAddress,
        baseAccountFactoryOld.address,
        signer
      );

      await entryPoint.handleOps(userOps, beneficiary.address);

      for (let i = 0; i < baseAccountPairs.length; i++) {
        const baseAccountPair = baseAccountPairs[i];
        const implementationAtSlot = await ethers.provider.getStorageAt(
          baseAccountPair.baseAccountAddress,
          "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
        );

        const implementationAddress = ethers.utils.defaultAbiCoder.decode(
          ["address"],
          implementationAtSlot
        )[0];

        expect(implementationAddress).to.eq(newImplementationAddress);
      }
    });
  });
});
