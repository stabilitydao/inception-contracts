// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "../token/DividendToken.sol";
import "./MintingPool.sol";

/**
 * @title DividendMinter
 * @dev Contract allows users to stake Stability (PROFIT) tokens
 * and receive Stability Dividend (SDIV) tokens as reward.
 */
contract DividendMinter is MintingPool {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
    }

    function initialize(
        IERC20Upgradeable _profitToken,
        DividendToken _dividendToken,
        uint256 _rewardTokensPerBlock,
        uint256 _startBlock
    ) public initializer {
        __MintingPool_init(
            _profitToken,
            _dividendToken,
            _rewardTokensPerBlock,
            _startBlock
        );
    }
}
