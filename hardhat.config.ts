import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-etherscan";
import "solidity-coverage";
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
require("dotenv").config();

const config: HardhatUserConfig = {
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    },
  },

  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      saveDeployments: true,
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
      },
      chainId: 1,
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PK!],
      chainId: 5,
      live: true,
      saveDeployments: true,
      tags: ["staging"],
      gasMultiplier: 2,
    },
    polygon: {
      url: "https://rpc-mainnet.maticvigil.com",
      accounts: [process.env.PK!],
      chainId: 137,
      live: true,
      saveDeployments: true,
      gasMultiplier: 2,
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com/",
      accounts: [process.env.PK!],
      chainId: 80001,
      live: true,
      saveDeployments: true,
      gasMultiplier: 2,
    },
    arbitrum: {
      url: "https://rpc.ankr.com/arbitrum",
      accounts: [process.env.PK!],
      chainId: 42161,
      live: true,
      saveDeployments: true,
      gasMultiplier: 2,
    },
    optimism: {
      url: "https://mainnet.optimism.io",
      accounts: [process.env.PK!],
      chainId: 10,
      live: true,
      saveDeployments: true,
      gasMultiplier: 2,
    },
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ["local"],
    },
  },
  etherscan: {
    apiKey: {
      goerli: process.env.GOERLISCAN_API_KEY!,
      polygon: process.env.POLYGONSCAN_API_KEY!,
      mumbai: process.env.POLYGONSCAN_API_KEY!,
      optimism: process.env.OPTIMISM_API_KEY!,
      arbitrum: process.env.ARBISCAN_API_KEY!,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 9999,
          },
        },
      },
      {
        version: "0.8.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 9999,
          },
        },
      },
    ],
  },
};

export default config;
