// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "../interfaces/dexs.sol";

contract UniswapV3PoolMock is IUniswapV3Pool {
    constructor(address token0, address token1, uint24 fee) {}

    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    ) {
        return (79229077103499266544288,0,0,0,0,0,true);
    }
}