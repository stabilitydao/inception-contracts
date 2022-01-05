// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "../token/DividendToken.sol";
import "./DividendPayer.sol";

/**
 * @title ProfitPayer
 * @dev Allows holders of DividendToken to receive dividends in the form of PROFIT token.
 */
contract ProfitPayer is DividendPayer {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
    }

    function initialize(DividendToken sdiv_, ERC20Upgradeable profit_) public initializer {
        __DividendPayer_init(sdiv_, profit_);
    }
}
