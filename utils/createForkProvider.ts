import ganache from "ganache";
import { BigNumber } from "ethers";
import { getDefaultProvider } from "ethers";
import { providers } from "ethers";

export const getForkProvider = async () => {
  const provider = await getDefaultProvider(
    `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
  );

  const blockNumber = await provider.getBlockNumber();
  const gasPrice = (await provider.getGasPrice()).toHexString();
  const block = await provider.getBlock(blockNumber);
  const gasLimit = block.gasLimit.toHexString();

  return new providers.Web3Provider(
    // @ts-ignore
    ganache.provider({
      fork: {
        url: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
        blockNumber,
        deleteCache: false,
        chainId: 137,
        vmErrorsOnRPCResponse: true,
      },
      allowUnlimitedContractSize: true,
      gasPrice,
      gasLimit,
      default_balance_ether: 10000000000000,
      debug: true,
      accounts: [
        {
          //known private key
          secretKey:
            "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
          balance: BigNumber.from("100000000000000000000").toHexString(),
        },
      ],
      legacyInstamine: true,
    })
  );
};
