// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor(address recipient, uint256 amount) ERC20("TST", "TestToken") {
        _mint(recipient, amount);
    }
}
