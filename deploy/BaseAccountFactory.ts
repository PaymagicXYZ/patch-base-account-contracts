import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers, network } from "hardhat";
import { Address } from "hardhat-deploy/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;

  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const entryPoint = (await deployments.get("EntryPoint")).address;

  const { address } = await deploy("BaseAccountFactory", {
    from: deployer,
    args: [entryPoint],
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

deploy.tags = ["BaseAccountFactory"];
deploy.dependencies = ["EntryPoint"];
