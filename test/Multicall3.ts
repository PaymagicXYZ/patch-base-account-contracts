import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import { BigNumber, Contract } from "ethers";

const generateRandomAddress = () => {
  return `0x${Array(40)
    .fill(0)
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("")}`;
};

const getERC1155BalanceForOwner = async (
  contract: Contract,
  ownerAddress: string,
  tokenIds: number[]
): Promise<BigNumber> => {
  //create an array of addresses that is the same length as the tokenIds array
  const ownerAddressArray = new Array(tokenIds.length).fill(ownerAddress);
  try {
    const result = await contract.balanceOfBatch(ownerAddressArray, tokenIds);
    return result.reduce((a, b) => a.add(b), BigNumber.from(0));
  } catch (error) {
    console.error(
      `Error fetching ERC1155 balance for ${ownerAddress} with tokens ${tokenIds}: ${
        error.message ?? error
      }`
    );
    throw new Error(
      `Failed to fetch ERC1155 balance for owner ${ownerAddress}`
    );
  }
};

enum TokenType {
  ERC20 = "ERC20",
  ERC721 = "ERC721",
  ERC1155 = "ERC1155",
  Native = "Native",
}

function getApproveData(
  tokenType: TokenType,
  spenderAddress: string,
  amount?: BigNumber
): string {
  const abiCoder = new ethers.utils.AbiCoder();

  //only allow amount to be defined for ERC20 tokens
  if (tokenType !== TokenType.ERC20 && amount !== undefined) {
    throw new Error("Amount can only be defined for ERC20 tokens");
  }

  switch (tokenType) {
    case "ERC20":
      const erc20Abi = [
        "function approve(address spender, uint256 amount) external returns (bool)",
      ];
      const erc20Interface = new ethers.utils.Interface(erc20Abi);
      const erc20Data = erc20Interface.encodeFunctionData("approve", [
        spenderAddress,
        amount,
      ]);
      return erc20Data;

    case "ERC721":
      const erc721Abi = [
        "function setApprovalForAll(address operator, bool approved) external",
      ];
      const erc721Interface = new ethers.utils.Interface(erc721Abi);
      const erc721Data = erc721Interface.encodeFunctionData(
        "setApprovalForAll",
        [spenderAddress, true]
      );
      return erc721Data;

    case "ERC1155":
      const erc1155Abi = [
        "function setApprovalForAll(address operator, bool approved) external",
      ];
      const erc1155Interface = new ethers.utils.Interface(erc1155Abi);
      const erc1155Data = erc1155Interface.encodeFunctionData(
        "setApprovalForAll",
        [spenderAddress, true]
      );

      return erc1155Data;

    default:
      throw new Error("Invalid token type");
  }
}

const getFunctionSelector = (functionSignature: string): string => {
  return ethers.utils
    .keccak256(ethers.utils.toUtf8Bytes(functionSignature))
    .slice(0, 10);
};

function encodeTransferFromCallData(
  tokenType: TokenType,
  from: string,
  to: string,
  tokenIdOrAmount: BigNumber,
  erc1155AmountForId?: BigNumber
): string {
  let functionSignature = "";
  let encodedArguments = "";

  console.log(erc1155AmountForId);

  if (tokenType === "ERC1155" && erc1155AmountForId === undefined) {
    throw new Error("ERC1155 amount must be defined");
  }

  if (tokenType === "ERC721") {
    functionSignature = "transferFrom(address,address,uint256)";
    encodedArguments = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256"],
      [from, to, tokenIdOrAmount]
    );
  } else if (tokenType === "ERC20") {
    functionSignature = "transferFrom(address,address,uint256)";
    encodedArguments = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256"],
      [from, to, tokenIdOrAmount]
    );
  } else if (tokenType === "ERC1155") {
    functionSignature =
      "safeTransferFrom(address,address,uint256,uint256,bytes)";
    encodedArguments = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "bytes"],
      [from, to, tokenIdOrAmount, erc1155AmountForId, "0x"]
    );
  } else {
    throw new Error("Unsupported contract type");
  }

  return getFunctionSelector(functionSignature) + encodedArguments.slice(2);
}

// struct Call3Value {
//     address target;
//     bool allowFailure;
//     uint256 value;
//     bytes callData;
// }

//create a function to setup calls for the aggregate3Value function in the multicall contract
//the function use encodeTransferFromCallData to encode the call data for each of the tokens with their amounts or ids according to their tokentypes
//the function should return an array of Call3Value structs

type Call3Value = {
  target: string;
  allowFailure: boolean;
  value: BigNumber;
  callData: string;
};

//setup type for setupAggregate3ValueCall
type SetupAggregate3ValueCall = {
  tokenType: TokenType;
  from: string;
  to: string;
  tokenIdOrAmount?: BigNumber;
  tokenAddress?: string;
  value?: BigNumber;
  erc1155AmountForId?: BigNumber;
};

function setupAggregate3ValueCall(
  valueObj: SetupAggregate3ValueCall
): Call3Value {
  //destructure the valueObj
  const {
    tokenType,
    from,
    to,
    tokenIdOrAmount,
    tokenAddress,
    value,
    erc1155AmountForId,
  } = valueObj;

  //if the tokenType is ERC1155 and the erc1155AmountForId is undefined, throw an error
  if (tokenType === "ERC1155" && erc1155AmountForId === undefined) {
    throw new Error("ERC1155 amount must be defined");
  }

  return {
    target: tokenType === "Native" ? to : tokenAddress!,
    allowFailure: false,
    value: value ?? BigNumber.from(0),
    callData:
      tokenType === "Native"
        ? "0x"
        : encodeTransferFromCallData(
            tokenType,
            from,
            to,
            tokenIdOrAmount!,
            erc1155AmountForId
          ),
  };
}

describe("Multicall3", function () {
  async function deployMulticallAndTokensFixture() {
    const [socialDropUser] = await ethers.getSigners();

    //using generateRandomAddress, create 10 random addresses and store them in an array
    const recipients = new Array(10).fill(0).map(generateRandomAddress);

    //deploy TestERC20, TestERC721, TestERC1155
    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const testERC20 = await TestERC20.deploy(
      socialDropUser.address,
      parseEther("300")
    );

    expect(await testERC20.balanceOf(socialDropUser.address)).to.equal(
      parseEther("300")
    );

    const TestERC721 = await ethers.getContractFactory("TestERC721");
    const testERC721 = await TestERC721.deploy(
      socialDropUser.address,
      [0, 1, 2, 3, 4, 5]
    );

    expect(await testERC721.balanceOf(socialDropUser.address)).to.equal(6);

    const TestERC1155 = await ethers.getContractFactory("TestERC1155");
    const testERC1155 = await TestERC1155.deploy(
      socialDropUser.address,
      [0, 1, 2],
      [10, 20, 30]
    );

    //create a function that calls balanceOfBatch on the ERC1155 contract and returns the result as a total balance for all ids and addresses

    expect(
      Number(
        await getERC1155BalanceForOwner(
          testERC1155,
          socialDropUser.address,
          [0, 1, 2]
        )
      )
    ).to.equal(60);

    const Multicall3 = await ethers.getContractFactory("Multicall3");
    const multicall3 = await Multicall3.deploy();

    return {
      multicall3,
      testERC20,
      testERC721,
      testERC1155,
      socialDropUser,
      recipients,
    };
  }

  describe("Send multiCallTx", function () {
    it("Should correctly execute UserOp from Entrypoint", async function () {
      const {
        multicall3,
        testERC20,
        testERC721,
        testERC1155,
        socialDropUser,
        recipients,
      } = await loadFixture(deployMulticallAndTokensFixture);

      const approveData = getApproveData(
        TokenType.ERC20,
        multicall3.address,
        parseEther("300")
      );

      //ERC20 approve
      await socialDropUser.sendTransaction({
        to: testERC20.address,
        data: approveData,
      });

      //ERC721 approve
      await socialDropUser.sendTransaction({
        to: testERC721.address,
        data: getApproveData(TokenType.ERC721, multicall3.address),
      });

      //ERC1155 setApprovalForAll
      await socialDropUser.sendTransaction({
        to: testERC1155.address,
        data: getApproveData(TokenType.ERC1155, multicall3.address),
      });

      expect(
        await testERC20.allowance(socialDropUser.address, multicall3.address)
      ).to.equal(parseEther("300"));

      let calls = [];

      //ERC20 calls
      calls.push(
        setupAggregate3ValueCall({
          tokenType: TokenType.ERC20,
          from: socialDropUser.address,
          to: recipients[0],
          tokenIdOrAmount: parseEther("100"),
          tokenAddress: testERC20.address,
        })
      );

      calls.push(
        setupAggregate3ValueCall({
          tokenType: TokenType.ERC20,
          from: socialDropUser.address,
          to: recipients[1],
          tokenIdOrAmount: parseEther("100"),
          tokenAddress: testERC20.address,
        })
      );

      calls.push(
        setupAggregate3ValueCall({
          tokenType: TokenType.ERC20,
          from: socialDropUser.address,
          to: recipients[2],
          tokenIdOrAmount: parseEther("100"),
          tokenAddress: testERC20.address,
        })
      );

      //ERC721 calls
      calls.push(
        setupAggregate3ValueCall({
          tokenType: TokenType.ERC721,
          from: socialDropUser.address,
          to: recipients[0],
          tokenIdOrAmount: BigNumber.from(0),
          tokenAddress: testERC721.address,
        })
      );

      calls.push(
        setupAggregate3ValueCall({
          tokenType: TokenType.ERC721,
          from: socialDropUser.address,
          to: recipients[1],
          tokenIdOrAmount: BigNumber.from(1),
          tokenAddress: testERC721.address,
        })
      );

      calls.push(
        setupAggregate3ValueCall({
          tokenType: TokenType.ERC721,
          from: socialDropUser.address,
          to: recipients[2],
          tokenIdOrAmount: BigNumber.from(2),
          tokenAddress: testERC721.address,
        })
      );

      //ERC1155 calls
      calls.push(
        setupAggregate3ValueCall({
          tokenType: TokenType.ERC1155,
          from: socialDropUser.address,
          to: recipients[0],
          tokenIdOrAmount: BigNumber.from(0),
          tokenAddress: testERC1155.address,
          erc1155AmountForId: BigNumber.from(10),
        })
      );

      calls.push(
        setupAggregate3ValueCall({
          tokenType: TokenType.ERC1155,

          from: socialDropUser.address,
          to: recipients[1],
          tokenIdOrAmount: BigNumber.from(1),
          tokenAddress: testERC1155.address,
          erc1155AmountForId: BigNumber.from(20),
        })
      );

      calls.push(
        setupAggregate3ValueCall({
          tokenType: TokenType.ERC1155,
          from: socialDropUser.address,
          to: recipients[2],
          tokenIdOrAmount: BigNumber.from(2),
          tokenAddress: testERC1155.address,
          erc1155AmountForId: BigNumber.from(30),
        })
      );

      //   native ETH calls

      calls.push(
        setupAggregate3ValueCall({
          tokenType: TokenType.Native,
          from: socialDropUser.address,
          to: recipients[0],
          value: parseEther("100"),
        })
      );

      calls.push(
        setupAggregate3ValueCall({
          tokenType: TokenType.Native,
          from: socialDropUser.address,
          to: recipients[1],
          value: parseEther("100"),
        })
      );

      calls.push(
        setupAggregate3ValueCall({
          tokenType: TokenType.Native,
          from: socialDropUser.address,
          to: recipients[2],
          value: parseEther("100"),
        })
      );

      console.log(calls);

      //add up total value of calls to send with aggregate3Value transaction
      const totalValue = calls.reduce((acc, call) => {
        //add up the value of the calls
        if (call.value) {
          return acc.add(call.value);
        }
        return acc;
      }, BigNumber.from(0));

      await multicall3.aggregate3Value(calls, { value: totalValue });

      expect(await testERC20.balanceOf(recipients[0])).to.equal(
        parseEther("100")
      );

      expect(await testERC20.balanceOf(recipients[1])).to.equal(
        parseEther("100")
      );

      expect(await testERC20.balanceOf(recipients[2])).to.equal(
        parseEther("100")
      );

      expect(await testERC721.balanceOf(recipients[0])).to.equal(1);

      expect(await testERC721.balanceOf(recipients[1])).to.equal(1);

      expect(await testERC721.balanceOf(recipients[2])).to.equal(1);

      expect(await testERC1155.balanceOf(recipients[0], 0)).to.equal(10);

      expect(await testERC1155.balanceOf(recipients[1], 1)).to.equal(20);

      expect(await testERC1155.balanceOf(recipients[2], 2)).to.equal(30);

      expect(await ethers.provider.getBalance(recipients[0])).to.equal(
        parseEther("100")
      );

      expect(await ethers.provider.getBalance(recipients[1])).to.equal(
        parseEther("100")
      );

      expect(await ethers.provider.getBalance(recipients[2])).to.equal(
        parseEther("100")
      );
    });
  });
});
