// pragma solidity ^0.8.0;
// import "hardhat/console.sol";

// contract EIP712 {
//     // bytes32 private constant _HASHED_NAME = keccak256("Patch Wallet");

//     // bytes32 private constant DOMAIN_SEPARATOR_SIGNATURE_HASH =
//     //     keccak256(
//     //         "EIP712Domain(string name,uint256 chainId,address verifyingContract)"
//     //     );
//     // // See https://eips.ethereum.org/EIPS/eip-191
//     // string private constant EIP191_PREFIX_FOR_EIP712_STRUCTURED_DATA =
//     //     "\x19\x01";

//     // bytes32 private immutable _DOMAIN_SEPARATOR;
//     // uint256 private immutable DOMAIN_SEPARATOR_CHAIN_ID;

//     // /// @dev Calculate the DOMAIN_SEPARATOR
//     // function _calculateDomainSeparator(uint256 chainId)
//     //     private
//     //     view
//     //     returns (bytes32)
//     // {
//     //     console.log(address(this));
//     //     return
//     //         keccak256(
//     //             abi.encode(
//     //                 _HASHED_NAME,
//     //                 DOMAIN_SEPARATOR_SIGNATURE_HASH,
//     //                 chainId,
//     //                 address(this)
//     //             )
//     //         );
//     // }

//     // constructor() {
//     //     uint256 chainId;
//     //     assembly {
//     //         chainId := chainid()
//     //     }
//     //     _DOMAIN_SEPARATOR = _calculateDomainSeparator(
//     //         DOMAIN_SEPARATOR_CHAIN_ID = chainId
//     //     );
//     // }

//     /// @dev Return the DOMAIN_SEPARATOR
//     // It's named internal to allow making it public from the contract that uses it by creating a simple view function
//     // with the desired public name, such as DOMAIN_SEPARATOR or domainSeparator.
//     // solhint-disable-next-line func-name-mixedcase
//     function _domainSeparator() internal view returns (bytes32) {
//         uint256 chainId;
//         assembly {
//             chainId := chainid()
//         }
//         return
//             chainId == DOMAIN_SEPARATOR_CHAIN_ID
//                 ? _DOMAIN_SEPARATOR
//                 : _calculateDomainSeparator(chainId);
//     }

//     function _getDigest(bytes32 dataHash)
//         internal
//         view
//         returns (bytes32 digest)
//     {
//         digest = keccak256(
//             abi.encodePacked(
//                 EIP191_PREFIX_FOR_EIP712_STRUCTURED_DATA,
//                 _domainSeparator(),
//                 dataHash
//             )
//         );
//     }
// }
