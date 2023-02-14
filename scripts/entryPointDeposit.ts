// @ts-ignore
import { ethers } from "hardhat";

async function main() {
  const entryPointAddress = "0xEe5C82eDfB590526115B0B37fAcDC75844Bcf31F";
  const verifyingPaymasterAddress =
    "0x723bCb56311775cE3e21436931015c4cC5f12467";

  const EntryPoint = await ethers.getContractAt(
    "EntryPoint",
    entryPointAddress
  );

  await EntryPoint.depositTo(verifyingPaymasterAddress, {
    value: ethers.utils.parseEther("1"),
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
