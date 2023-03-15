// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */
/* solhint-disable reason-string */

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

import "./core/BaseAccountCore.sol";
import "./interfaces/IERC1271.sol";

/**
 * minimal account.
 *  this is sample minimal account.
 *  has execute, eth handling methods
 *  has a single signer that can send requests through the entryPoint.
 */
contract BaseAccount is
    BaseAccountCore,
    UUPSUpgradeable,
    Initializable,
    IERC1271
{
    using ECDSA for bytes32;

    //explicit sizes of nonce, to fit a single storage cell with "owner"
    uint96 private _nonce;
    address public owner;

    IEntryPoint private immutable _entryPoint;

    event SimpleAccountInitialized(
        IEntryPoint indexed entryPoint,
        address indexed owner
    );

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    function nonce() public view virtual override returns (uint256) {
        return _nonce;
    }

    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
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
     * execute a sequence of transactions
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
    function initialize(address anOwner) public virtual initializer {
        _initialize(anOwner);
    }

    bytes32 private constant _HASHED_NAME = keccak256("Patch Wallet");

    bytes32 private constant DOMAIN_SEPARATOR_SIGNATURE_HASH =
        keccak256(
            "EIP712Domain(string name,uint256 chainId,address verifyingContract)"
        );
    // See https://eips.ethereum.org/EIPS/eip-191
    string private constant EIP191_PREFIX_FOR_EIP712_STRUCTURED_DATA =
        "\x19\x01";

    bytes32 private _DOMAIN_SEPARATOR;
    uint256 private DOMAIN_SEPARATOR_CHAIN_ID;

    function _calculateDomainSeparator(
        uint256 chainId
    ) private view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    _HASHED_NAME,
                    DOMAIN_SEPARATOR_SIGNATURE_HASH,
                    chainId,
                    address(this)
                )
            );
    }

    function _initialize(address anOwner) internal virtual {
        owner = anOwner;
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        _DOMAIN_SEPARATOR = _calculateDomainSeparator(
            DOMAIN_SEPARATOR_CHAIN_ID = chainId
        );
        emit SimpleAccountInitialized(_entryPoint, owner);
    }

    function _domainSeparator() internal view returns (bytes32) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        return
            chainId == DOMAIN_SEPARATOR_CHAIN_ID
                ? _DOMAIN_SEPARATOR
                : _calculateDomainSeparator(chainId);
    }

    // Require the function call went through EntryPoint or owner
    function _requireFromEntryPointOrOwner() internal view {
        require(
            msg.sender == address(entryPoint()) || msg.sender == owner,
            "account: not Owner or EntryPoint"
        );
    }

    /// implement template method of BaseAccount
    function _validateAndUpdateNonce(
        UserOperation calldata userOp
    ) internal override {
        require(_nonce++ == userOp.nonce, "account: invalid nonce");
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

    bytes4 internal constant VALID_SIG = IERC1271.isValidSignature.selector;
    bytes4 internal constant INVALID_SIG = bytes4(0);

    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return _domainSeparator();
    }

    function _verifySignature(
        bytes32 data,
        bytes memory signature
    ) public view returns (bytes4) {
        bytes32 prefixedHash = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), data)
        );

        return
            (owner != prefixedHash.toEthSignedMessageHash().recover(signature))
                ? VALID_SIG
                : INVALID_SIG;
    }

    function isValidSignature(
        bytes32 data,
        bytes memory signature
    ) public view override returns (bytes4) {
        return _verifySignature(data, signature);
    }
}
