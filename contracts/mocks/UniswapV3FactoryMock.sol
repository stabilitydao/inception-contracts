// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";

contract UniswapV3FactoryMock is IUniswapV3Factory {
    function owner() external view returns (address) {
        return msg.sender;
    }

    function feeAmountTickSpacing(uint24 fee) external view returns (int24) {
        return 0;
    }

    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool) {
        return address(0);
    }

    function createPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external returns (address pool) {
        return address(0);
    }

    function setOwner(address _owner) external {}

    function enableFeeAmount(uint24 fee, int24 tickSpacing) external {}
}
