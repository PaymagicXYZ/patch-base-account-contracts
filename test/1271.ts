import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers, getChainId } from 'hardhat';
import { _HASHED_NAME } from '../utils/1271';
import { Contract } from 'ethers';
import { Address, encodeAbiParameters, encodeFunctionData, keccak256, verifyMessage } from 'viem';
import { arrayify, toUtf8Bytes, toUtf8String } from 'ethers/lib/utils';

describe('1271', function () {
  let baseAccountFactory: Contract | undefined;

  async function deployWalletFixture() {
    const [owner] = await ethers.getSigners();

    const EntryPoint = await ethers.getContractFactory('EntryPoint');
    const entryPoint = await EntryPoint.deploy();

    const BaseAccountFactory = await ethers.getContractFactory('BaseAccountFactory');
    baseAccountFactory = await BaseAccountFactory.deploy(entryPoint.address);

    if (!baseAccountFactory) throw new Error('BaseAccountFactory not deployed');

    const receipt = await baseAccountFactory.createAccount(owner.address, '0xa').then((tx: any) => tx.wait());

    const baseAccountAddress = receipt.events.find(({ event }: { event: string }) => event === 'BaseAccountCreated').args[0];

    const baseAccountContract = await ethers.getContractAt('BaseAccount', baseAccountAddress);

    const receipt2 = await baseAccountFactory.createAccount(owner.address, '0xaB').then((tx: any) => tx.wait());

    const baseAccountAddress2 = receipt2.events.find(({ event }: { event: string }) => event === 'BaseAccountCreated').args[0];

    const baseAccountContract2 = await ethers.getContractAt('BaseAccount', baseAccountAddress2);

    const counterFactualSalt = ethers.BigNumber.from(toUtf8Bytes('IAmCounterfactualSalt'));
    const counterFactualAddress = await baseAccountFactory.getAddress(owner.address, counterFactualSalt);

    return {
      baseAccountFactory,
      owner,
      entryPoint,
      baseAccountContract,
      baseAccountContract2,
      counterFactualSalt,
      counterFactualAddress,
      receipt,
      receipt2,
    };
  }

  describe('isValidSignature', function () {
    it('check counterfactual address', async () => {
      const { owner, counterFactualAddress, counterFactualSalt } = await loadFixture(deployWalletFixture);

      const data = ethers.utils.randomBytes(32);
      const nonce = 0;
      // generate the domain separator for the counterfactual address
      const domainSeparator = keccak256(
        encodeAbiParameters(
          [
            { type: 'bytes32', name: 'name' },
            { type: 'bytes32', name: 'version' },
            { type: 'uint256', name: 'chainId' },
            { type: 'address', name: 'address' },
          ],
          [
            keccak256(toUtf8Bytes('Patch Wallet')),
            keccak256(toUtf8Bytes('EIP712Domain(string name,uint256 chainId,address verifyingContract)')),
            BigInt(await getChainId()),
            counterFactualAddress,
          ]
        )
      );

      const context = ethers.utils.arrayify(ethers.utils.solidityKeccak256(['bytes32', 'uint256', 'bytes32'], [domainSeparator, nonce, data]));
      const dataHashed = ethers.utils.arrayify(ethers.utils.solidityKeccak256(['bytes32'], [data]));

      const signature_1271 = await owner.signMessage(context);

      const factoryCreationCalldata = baseAccountFactory!.interface.encodeFunctionData('createAccount', [
        owner.address,
        counterFactualSalt,
      ]) as `0x${string}`;
      console.log({ giveOwner: owner.address });
      const signature_6492_account_not_created =
        encodeAbiParameters(
          [
            { type: 'address', name: 'create2Factory' },
            { type: 'bytes', name: 'factoryCalldata' },
            { type: 'bytes', name: 'signature' },
          ],
          [baseAccountFactory!.address as Address, factoryCreationCalldata, signature_1271 as `0x${string}`]
        ) + '6492'.repeat(16);

      const validateOffChainContract = await ethers.getContractFactory('ValidateSigOffchain');

      var validateSigOffchainBytecode = validateOffChainContract.bytecode;

      const isValidSignature =
        '0x01' ===
        (await ethers.provider.call({
          data: ethers.utils.concat([
            validateSigOffchainBytecode,
            new ethers.utils.AbiCoder().encode(['address', 'bytes32', 'bytes'], [counterFactualAddress, data, signature_6492_account_not_created]),
          ]),
        }));

      console.log('is the sig valid: ', isValidSignature);
    });

    it('should validate for correct nonces and base account addresses', async () => {
      const { owner, baseAccountContract } = await loadFixture(deployWalletFixture);

      const data = ethers.utils.randomBytes(32);
      const nonce = await baseAccountContract.nonce();
      const domainSeparator = await baseAccountContract.DOMAIN_SEPARATOR();

      const context = ethers.utils.arrayify(ethers.utils.solidityKeccak256(['bytes32', 'uint256', 'bytes32'], [domainSeparator, nonce, data]));

      const signature = await owner.signMessage(context);
      const isValid = await baseAccountContract.isValidSignature(data, signature);

      expect(isValid).to.equal('0x1626ba7e');
    });

    it('should not validate for incorrect nonces', async () => {
      const { owner, baseAccountContract } = await loadFixture(deployWalletFixture);

      const data = ethers.utils.randomBytes(32);
      const nonce = (await baseAccountContract.nonce()).add(1);

      // Sign the data with the owner's private key
      const message = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['bytes32', 'uint256', 'bytes32'], [await baseAccountContract.DOMAIN_SEPARATOR(), nonce, data])
      );
      const signature = await owner.signMessage(message);

      // Call isValidSignature on the BaseAccount contract
      const result = await baseAccountContract.isValidSignature(data, signature);

      // Check if the result is INVALID_SIG (0x00000000)
      expect(result).to.equal('0x00000000');
    });

    it('should not validate for incorrect base account addresses', async function () {
      const { owner, baseAccountContract, baseAccountContract2 } = await loadFixture(deployWalletFixture);

      const data = ethers.utils.randomBytes(32);
      const nonce = (await baseAccountContract.nonce()).add(1);

      // Sign the data with the owner's private key
      const message = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['bytes32', 'uint256', 'bytes32'], [await baseAccountContract.DOMAIN_SEPARATOR(), nonce, data])
      );
      const signature = await owner.signMessage(message);

      // Call isValidSignature on the BaseAccount contract
      const result = await baseAccountContract2.isValidSignature(data, signature);

      // Check if the result is INVALID_SIG (0x00000000)
      expect(result).to.equal('0x00000000');
    });
  });
});
