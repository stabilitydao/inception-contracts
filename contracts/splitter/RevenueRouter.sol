// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/swap-router-contracts/contracts/interfaces/IV3SwapRouter.sol";
import "../interfaces/ISplitter.sol";
import "../interfaces/IPayer.sol";

contract RevenueRouter is Ownable {
    address public PROFIT;
    address public BASE;
    uint24 public BASE_FEE;
    ISplitter public splitter;
    IPayer public profitPayer;
    IV3SwapRouter public v3Router;

    struct InputToken {
        address revenueToken;
        address swapToToken;
        uint24 poolFee;
    }

    // An array of tokens that can be swapped to PROFIT.
    InputToken[] public inputToken;

    event SwappedTokenForProfit(address tokenIn, address tokenOut, address recipient, uint256 amountOut);
    event NewInputTokenAdded(address indexed revenueToken, address indexed swapToToken, uint24 poolFee);

    constructor (
        address PROFIT_,
        address BASE_,
        uint24 BASE_FEE_,
        IV3SwapRouter v3Router_,
        ISplitter splitter_,
        IPayer profitPayer_
    ) {
        PROFIT = PROFIT_;
        BASE = BASE_;
        BASE_FEE = BASE_FEE_;
        v3Router = v3Router_;
        splitter = splitter_;
        profitPayer = profitPayer_;
    }

    // important to receive ETH
    receive() external payable {}

    function addedTokens() external view returns (uint256) {
        return inputToken.length;
    }

    // Add a new token to list of tokens that can be swapped to PROFIT.
    function addToken(address revenueToken_, address swapToToken_, uint24 _poolFee) external onlyOwner {
        inputToken.push(
            InputToken({
        revenueToken: revenueToken_,
        swapToToken: swapToToken_,
        poolFee: _poolFee
        })
        );
        emit NewInputTokenAdded(revenueToken_, swapToToken_, _poolFee);
    }

    // function to remove tokenIn (spends less gas)
    function deleteToken(uint256 _index) external onlyOwner {
        require(_index < inputToken.length, "index out of bound");
        inputToken[_index] = inputToken[inputToken.length - 1];
        inputToken.pop();
    }

    function run() external {
        swapTokens();
        splitter.run(address(PROFIT), address(profitPayer));
    }

    function swapTokens() public returns (uint256 amountOut) {
        for (uint256 i = 0; i < inputToken.length; i++) {
            InputToken storage tokenIn = inputToken[i];
            uint256 tokenBal = IERC20(tokenIn.revenueToken).balanceOf(address(this));

            if (tokenBal > 0) {
                // If TOKEN is Paired with BASE token (WETH now)
                if (tokenIn.swapToToken == BASE) {
                    // Swap TOKEN to WETH
                    IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn.revenueToken,
                    tokenOut: BASE,
                    fee: BASE_FEE,
                    recipient: address(this),
                    amountIn: tokenBal,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                    });
                    // approve dexRouter to spend tokens
                    if (IERC20(tokenIn.revenueToken).allowance(address(this), address(v3Router)) < tokenBal) {
                        TransferHelper.safeApprove(tokenIn.revenueToken, address(v3Router), type(uint256).max);
                    }
                    amountOut = v3Router.exactInputSingle(params);
                    // Swap WETH to PROFIT
                    IV3SwapRouter.ExactInputSingleParams memory params2 = IV3SwapRouter.ExactInputSingleParams({
                    tokenIn: BASE,
                    tokenOut: PROFIT,
                    fee: BASE_FEE,
                    recipient: address(splitter),
                    amountIn: amountOut,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                    });
                    // approve dexRouter to spend WETH
                    if (IERC20(BASE).allowance(address(this), address(v3Router)) < amountOut) {
                        TransferHelper.safeApprove(BASE, address(v3Router), type(uint256).max);
                    }
                    amountOut = v3Router.exactInputSingle(params2);
                } else {
                    // If TOKEN is Paired with swapToToken
                    // Swap TOKEN to USDT
                    IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn.revenueToken,
                    tokenOut: tokenIn.swapToToken,
                    fee: tokenIn.poolFee,
                    recipient: address(this),
                    amountIn: tokenBal,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                    });
                    // approve dexRouter to spend TOKEN
                    if (IERC20(tokenIn.revenueToken).allowance(address(this), address(v3Router)) < tokenBal) {
                        TransferHelper.safeApprove(tokenIn.revenueToken, address(v3Router), type(uint256).max);
                    }
                    amountOut = v3Router.exactInputSingle(params);
                    // Swap USDT to WETH
                    // uint256 usdtBal = IERC20(USDT).balanceOf(address(this));
                    IV3SwapRouter.ExactInputSingleParams memory params2 = IV3SwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn.swapToToken,
                    tokenOut: BASE,
                    fee: BASE_FEE,
                    recipient: address(this),
                    amountIn: amountOut,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                    });
                    // approve dexRouter to spend USDT
                    if (IERC20(tokenIn.swapToToken).allowance(address(this), address(v3Router)) < amountOut) {
                        TransferHelper.safeApprove(tokenIn.swapToToken, address(v3Router), type(uint256).max);
                    }
                    amountOut = v3Router.exactInputSingle(params2);
                    // Swap WETH to PROFIT
                    // uint256 wethBal = IERC20(WETH).balanceOf(address(this));
                    IV3SwapRouter.ExactInputSingleParams memory params3 = IV3SwapRouter.ExactInputSingleParams({
                    tokenIn: BASE,
                    tokenOut: PROFIT,
                    fee: BASE_FEE,
                    recipient: address(splitter),
                    amountIn: amountOut,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                    });
                    // approve dexRouter to spend WETH
                    if (IERC20(BASE).allowance(address(this), address(v3Router)) < amountOut) {
                        TransferHelper.safeApprove(BASE, address(v3Router), type(uint256).max);
                    }
                    amountOut = v3Router.exactInputSingle(params3);
                }

                emit SwappedTokenForProfit(tokenIn.revenueToken, PROFIT, address(splitter), amountOut);
            }
        }
    }

    function withdraw(address _token, address _to, uint256 _amount) public onlyOwner {
        IERC20(_token).transfer(_to, _amount);
    }

}