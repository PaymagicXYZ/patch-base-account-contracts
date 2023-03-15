// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestERC721 is ERC721 {
    constructor(
        address recipient,
        uint256[] memory ids
    ) ERC721("TERC721", "TERC721") {
        mintBatchToRecipient(recipient, ids);
    }

    function mintBatchToRecipient(
        address recipient,
        uint256[] memory ids
    ) internal {
        for (uint256 i = 0; i < ids.length; i++) {
            _mint(recipient, ids[i]);
        }
    }
}
