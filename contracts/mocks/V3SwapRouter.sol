// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.9;

import "@uniswap/swap-router-contracts/contracts/interfaces/IV3SwapRouter.sol";
//import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract V3SwapRouter is IV3SwapRouter {
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        amountOut = params.amountIn * 2;
//        IERC20(params.tokenOut).transferFrom(msg.sender, params.recipient, amountOut);
        return amountOut;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut) {
        return params.amountIn * 2;
    }

    function exactOutput(ExactOutputParams calldata params) external payable returns (uint256 amountIn) {
        return params.amountOut * 3;
    }

    function exactOutputSingle(ExactOutputSingleParams calldata params) external payable returns (uint256 amountIn) {
        return params.amountOut * 3;
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external {}
}