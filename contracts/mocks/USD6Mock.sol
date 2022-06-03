// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USD6Mock is ERC20 {
    constructor() ERC20("USD6 coin", "USD6") {
        _mint(msg.sender, 10**24);
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}