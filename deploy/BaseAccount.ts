import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers, network } from "hardhat";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;

  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const { address } = await deploy("BaseAccount", {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: "0x9999",
  });
};

export default deploy;

deploy.tags = ["BaseAccount"];
