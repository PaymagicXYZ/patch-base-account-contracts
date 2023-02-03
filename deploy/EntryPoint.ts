import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers, network } from "hardhat";

const deployFunction: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts, getChainId } = hre;

  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const { address } = await deploy("EntryPoint", {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: "0x7011",
  });

  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [],
    });
  } catch (error) {
    console.error(error);
  }
};

export default deployFunction;

deployFunction.tags = ["EntryPoint"];
