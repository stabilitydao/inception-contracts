// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { L2StandardERC20 } from "@eth-optimism/contracts/standards/L2StandardERC20.sol";
import '@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol';

contract OptimisticProfitToken is L2StandardERC20, ERC20Permit, ERC20Votes {
    constructor(
        address _l2Bridge,
        address _l1Token
    ) L2StandardERC20(_l2Bridge, _l1Token, "Stability", "PROFIT") ERC20Permit('Stability') {}

    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }
}
