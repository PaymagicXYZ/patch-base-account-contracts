import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers, network } from "hardhat";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;

  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const entryPoint = (await deployments.get("EntryPoint")).address;

  const owner = "0xf0d5D3FcBFc0009121A630EC8AB67e012117f40c";

  const { address } = await deploy("VerifyingPaymaster", {
    from: deployer,
    args: [entryPoint, owner],
    log: true,
    deterministicDeployment: "0x7011",
  });

  // try {
  //   await hre.run("verify:verify", {
  //     address: address,
  //     constructorArguments: [],
  //   });
  // } catch (error) {
  //   console.error(error);
  // }
};

export default deploy;

deploy.tags = ["VerifyingPaymaster"];
deploy.dependencies = ["EntryPoint"];
