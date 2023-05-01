import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers, network } from "hardhat";
import { Address } from "hardhat-deploy/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;

  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const entryPoint = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

  const { address } = await deploy("BaseAccountFactory", {
    from: deployer,
    args: [entryPoint],
    log: true,
    deterministicDeployment: "0x9999",
  });
};

export default deploy;

deploy.tags = ["BaseAccountFactory"];
