// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */
/* solhint-disable reason-string */

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

import "./core/BaseAccountCore.sol";
import "./callback/TokenCallbackHandler.sol";
import "./interfaces/IERC1271.sol";

import "hardhat/console.sol";

/**
 * minimal account.
 *  this is sample minimal account.
 *  has execute, eth handling methods
 *  has a single signer that can send requests through the entryPoint.
 */
contract BaseAccount is
    BaseAccountCore,
    TokenCallbackHandler,
    UUPSUpgradeable,
    Initializable,
    IERC1271
{
    using ECDSA for bytes32;

    address public owner;

    IEntryPoint private _entryPoint;

    event SimpleAccountInitialized(
        IEntryPoint indexed entryPoint,
        address indexed owner
    );

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    // EIP712
    bytes32 DOMAIN_SEPARATOR;
    struct EIP712Domain {
        string  name;
        string  version;
        uint256 chainId;
        address verifyingContract;
    }

    struct Person {
        string name;
        address wallet;
    }

    struct Mail {
        Person from;
        Person to;
        string contents;
    }

    bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 constant PERSON_TYPEHASH = keccak256(
        "Person(string name,address wallet)"
    );

    bytes32 constant MAIL_TYPEHASH = keccak256(
        "Mail(Person from,Person to,string contents)Person(string name,address wallet)"
    );

    /// @inheritdoc BaseAccountCore
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    function changeEntrypoint(IEntryPoint newEntryPoint) external onlyOwner {
        _requireFromEntryPointOrOwner();
        _entryPoint = newEntryPoint;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    constructor() {
        _disableInitializers();
    }

    function _onlyOwner() internal view {
        //directly from EOA owner, or through the account itself (which gets redirected through execute())
        require(
            msg.sender == owner || msg.sender == address(this),
            "only owner"
        );
    }

    /**
     * execute a transaction (called directly from owner, or by entryPoint)
     */
    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external {
        _requireFromEntryPointOrOwner();
        _call(dest, value, func);
    }

    /**
     * execute a sequence of transactions
     */
    function executeBatch(
        address[] calldata dest,
        bytes[] calldata func
    ) external {
        _requireFromEntryPointOrOwner();
        require(dest.length == func.length, "wrong array lengths");
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], 0, func[i]);
        }
    }

    /**
     * execute a sequence of transactions with value
     */
    function executeBatchValue(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external {
        _requireFromEntryPointOrOwner();
        require(dest.length == func.length, "wrong array lengths");
        require(value.length == func.length, "wrong array lengths");
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], value[i], func[i]);
        }
    }

    /**
     * @dev The _entryPoint member is immutable, to reduce gas consumption.  To upgrade EntryPoint,
     * a new implementation of SimpleAccount must be deployed with the new EntryPoint address, then upgrading
     * the implementation by calling `upgradeTo()`
     */
    function initialize(
        address anOwner,
        IEntryPoint entryPoint_
    ) public virtual initializer {
        _initialize(anOwner, entryPoint_);
    }

    function _initialize(
        address anOwner,
        IEntryPoint entryPoint_
    ) internal virtual {
        owner = anOwner;
        _entryPoint = entryPoint_;
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        DOMAIN_SEPARATOR = hash(EIP712Domain({
            name: "Patch Wallet",
            version: '1',
            chainId: chainId,
            verifyingContract: address(this)
        //  verifyingContract: 0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC
        }));
        emit SimpleAccountInitialized(_entryPoint, owner);
    }

    // Require the function call went through EntryPoint or owner
    function _requireFromEntryPointOrOwner() internal view {
        require(
            msg.sender == address(entryPoint()) || msg.sender == owner,
            "account: not Owner or EntryPoint"
        );
    }

    /// implement template method of BaseAccount
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner != hash.recover(userOp.signature))
            return SIG_VALIDATION_FAILED;
        return 0;
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /**
     * check current account deposit in the entryPoint
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint().balanceOf(address(this));
    }

    /**
     * deposit more funds for this account in the entryPoint
     */
    function addDeposit() public payable {
        entryPoint().depositTo{value: msg.value}(address(this));
    }

    /**
     * withdraw value from the account's deposit
     * @param withdrawAddress target to send to
     * @param amount to withdraw
     */
    function withdrawDepositTo(
        address payable withdrawAddress,
        uint256 amount
    ) public onlyOwner {
        entryPoint().withdrawTo(withdrawAddress, amount);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal view override {
        (newImplementation);
        _onlyOwner();
    }

    function hash(EIP712Domain memory eip712Domain) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            EIP712DOMAIN_TYPEHASH,
            keccak256(bytes(eip712Domain.name)),
            keccak256(bytes(eip712Domain.version)),
            eip712Domain.chainId,
            eip712Domain.verifyingContract
        ));
    }

    function hash(Person memory person) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            PERSON_TYPEHASH,
            keccak256(bytes(person.name)),
            person.wallet
        ));
    }

    function hash(Mail memory mail) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            MAIL_TYPEHASH,
            hash(mail.from),
            hash(mail.to),
            keccak256(bytes(mail.contents))
        ));
    }

    bytes4 internal constant VALID_SIG = IERC1271.isValidSignature.selector;
    bytes4 internal constant INVALID_SIG = bytes4(0);

    function _verifySignature(
        bytes32 data,
        bytes memory signature
    ) public view returns (bytes4) {
        bytes memory context = abi.encodePacked(
            '\x19\x01',
            DOMAIN_SEPARATOR,
            data
        );
        console.logBytes(context);

        bytes32 message = keccak256(context);

        bytes32 messageHash = message.toEthSignedMessageHash();

        return
            (owner == messageHash.recover(signature)) ? VALID_SIG : INVALID_SIG;
    }

    function verifyMail(
        bytes32 data,
        bytes memory signature
    ) public view returns (bytes4) {
        bytes memory context = abi.encodePacked(
            '\x19\x01',
            DOMAIN_SEPARATOR,
            data
        );
        console.logBytes(context);
//        bytes memory digest = abi.encodePacked(
//            "\x19\x01",
//            DOMAIN_SEPARATOR,
//            hash(mail)
//        );
//        console.logBytes(digest);

        bytes32 message = keccak256(context);
        console.logBytes32(message);

        bytes32 messageHash = message.toEthSignedMessageHash();
        console.logBytes32(messageHash);

        console.log(messageHash.recover(signature));
        console.log(owner);
        return
        (owner == messageHash.recover(signature)) ? VALID_SIG : INVALID_SIG;
    }

    function isValidSignature(
        bytes32 data,
        bytes memory signature
    ) public view override returns (bytes4) {
        return _verifySignature(data, signature);
    }
}
