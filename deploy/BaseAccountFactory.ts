import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers, network } from "hardhat";
import { Address } from "hardhat-deploy/types";

const deployFunction: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts, getChainId } = hre;

  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const wallet = (await deployments.get("BaseAccount")).address;

  const { address } = await deploy("BaseAccountFactory", {
    from: deployer,
    args: [wallet],
    log: true,
    deterministicDeployment: "0x70",
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

deployFunction.tags = ["BaseAccountFactory"];
deployFunction.dependencies = ["BaseAccount"];
