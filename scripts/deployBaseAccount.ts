// @ts-ignore
import { ethers } from "hardhat";

async function main() {
  const salt = "0xAaAa";

  const owner = "0x000000000000000000000000000000000000000a";
  const BaseAccountFactoryAddress =
    "0x000000000000000000000000000000000000000a";

  const baseAccountFactory = await ethers.getContractAt(
    "BaseAccountFactory",
    BaseAccountFactoryAddress
  );

  const receipt = await baseAccountFactory
    .createAccount(owner, salt)
    .then((tx: any) => tx.wait());

  const baseAccountAddress = receipt.events.find(
    ({ event }: { event: string }) => event === "BaseAccountCreated"
  )!.args[0];

  console.log(`BaseAccount for ${owner} deployed to ${baseAccountAddress}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
