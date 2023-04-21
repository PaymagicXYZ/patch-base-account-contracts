// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    constructor(address recipient, uint256 amount) ERC20("TERC20", "TERC20") {
        _mint(recipient, amount);
    }

    function mint(address recipient, uint256 amount) public {
        _mint(recipient, amount);
    }
}
