// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract TestERC1155 is ERC1155 {
    constructor(
        address recipient,
        uint256[] memory ids,
        uint256[] memory amounts
    ) ERC1155("") {
        _mintBatch(recipient, ids, amounts, "");
    }
}
