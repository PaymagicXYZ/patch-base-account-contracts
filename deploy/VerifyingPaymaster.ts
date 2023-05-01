import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers, network } from "hardhat";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;

  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const entryPoint = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

  const patchAuthority = "0xaD6442a1b5A9D5a25eDE2f8dC3A99C7038b95CD5";

  const owner = "0xd0F5181499a9967b5cF7142dF003232E94ef22cE";

  const { address } = await deploy("VerifyingPaymaster", {
    from: deployer,
    args: [entryPoint, patchAuthority, owner],
    log: true,
    deterministicDeployment: "0x9999",
  });
};

export default deploy;

deploy.tags = ["VerifyingPaymaster"];
