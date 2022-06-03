// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../interfaces/dexs.sol";
import "./UniswapV3PoolMock.sol";

contract UniswapV3FactoryMock is IUniswapV3Factory {
    mapping(address => mapping(address => mapping(uint24 => address))) public getPool;

    function createPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external returns (address pool) {
        require(tokenA != tokenB);
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0));
        require(getPool[token0][token1][fee] == address(0));
        pool = address(new UniswapV3PoolMock(token0, token1, fee));
        getPool[token0][token1][fee] = pool;
        getPool[token1][token0][fee] = pool;
    }
}
