// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../interfaces/dexs.sol";

contract UniswapV3RouterMock is IUniswapV3Router {
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        amountOut = params.amountIn * 2;
    }
}
