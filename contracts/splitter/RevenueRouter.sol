// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

contract RevenueRouter is Ownable {
    address public PROFIT;
    address public WETH;
    address public WMATIC;
    address public USDT;
    address public splitter;

    // TODO: Need to create struct for weth, wmatic, usdt. With respective fees

    // function to set weth, wmatic, usdt. With respective fees

    // function to set new router and pair

    ISwapRouter public dexRouter;

    event SwappedTokenForProfit(address tokenIn, address tokenOut, address recipient, uint256 amountOut);
    event NewInputTokenAdded(address tokenIn, uint24 poolFee);

    constructor (
        address _PROFIT,
        address _WETH,
        address _WMATIC,
        address _USDT,
        ISwapRouter _dexRouter,
        address _splitter
    ) {
        PROFIT = _PROFIT;
        WETH = _WETH;
        WMATIC = _WMATIC;
        USDT = _USDT;
        dexRouter = _dexRouter;
        splitter = _splitter;
    }

    // important to receive ETH
    receive() external payable {}
    
    struct InputToken {
        address tokenToSwap;
        uint24 poolFee;
    }

    // An array of tokens that can be swapped to PROFIT.
    InputToken[] public inputToken;

    function addedTokens() external view returns (uint256) {
        return inputToken.length;
    }

    // Add a new token to list of tokens that can be swapped to PROFIT.
    function addToken(address _tokenToSwap, uint24 _poolFee) external onlyOwner {
        inputToken.push(
            InputToken({
                tokenToSwap: _tokenToSwap,
                poolFee: _poolFee
            })
        );
        emit NewInputTokenAdded(_tokenToSwap, _poolFee);
    }

    // function to remove tokenIn
    function removeToken(uint256 _index) external onlyOwner {
        require(_index < inputToken.length, "index out of bound");
        for (uint256 i = _index; i < inputToken.length - 1; i++) {
            inputToken[i] = inputToken[i + 1];
        }
        inputToken.pop();
    }

    // function to remove tokenIn (spends less gas)
    function deleteToken(uint256 _index) external onlyOwner {
        require(_index < inputToken.length, "index out of bound");
        inputToken[_index] = inputToken[inputToken.length - 1];
        inputToken.pop();
    }

    function swapTokens() external returns (uint256 amountOut) {
        for (uint256 i = 0; i < inputToken.length; i++) {
            InputToken storage tokenIn = inputToken[i];
            uint256 tokenBal = IERC20(tokenIn.tokenToSwap).balanceOf(address(this));

            // If TOKEN is Paired with WETH            
            if (/*v3Factory.getPool(tokenIn.tokenToSwap, WETH, tokenIn.poolFee) != address(0) && */tokenBal > 0) {
                // Swap TOKEN to WETH
                ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn.tokenToSwap,
                    tokenOut: WETH,
                    fee: tokenIn.poolFee,
                    recipient: address(this),
                    amountIn: tokenBal,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0,
                    deadline: 0
                });
                // approve dexRouter to spend tokens
                if (IERC20(tokenIn.tokenToSwap).allowance(address(this), address(dexRouter)) < tokenBal) {
                    IERC20(tokenIn.tokenToSwap).approve(address(dexRouter), type(uint256).max);
                }
                amountOut = dexRouter.exactInputSingle(params);
                // Swap WETH to PROFIT
                ISwapRouter.ExactInputSingleParams memory params2 = ISwapRouter.ExactInputSingleParams({
                    tokenIn: WETH,
                    tokenOut: PROFIT,
                    fee: 3000,
                    recipient: address(splitter),
                    amountIn: amountOut,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0,
                    deadline: 0
                });
                // approve dexRouter to spend WETH
                if (IERC20(WETH).allowance(address(this), address(dexRouter)) < amountOut) {
                    IERC20(WETH).approve(address(dexRouter), type(uint256).max);
                }
                amountOut = dexRouter.exactInputSingle(params2);
                emit SwappedTokenForProfit(tokenIn.tokenToSwap, PROFIT, splitter, amountOut);
            }

            /*
            // If TOKEN is Paired with WMATIC
            if (v3Factory.getPool(tokenIn.tokenToSwap, WMATIC, tokenIn.poolFee) != address(0) && tokenBal > 0) {
                // Swap TOKEN to WMATIC
                ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn.tokenToSwap,
                    tokenOut: WMATIC,
                    fee: tokenIn.poolFee,
                    recipient: address(this),
                    amountIn: tokenBal,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
                // approve dexRouter to spend TOKEN
                if (IERC20(tokenIn.tokenToSwap).allowance(address(this), address(dexRouter)) < tokenBal) {
                    IERC20(tokenIn.tokenToSwap).approve(address(dexRouter), type(uint256).max);
                }
                amountOut = dexRouter.exactInputSingle(params);
                // Swap WMATIC to WETH
                // uint256 wMaticBal = IERC20(WMATIC).balanceOf(address(this));
                ISwapRouter.ExactInputSingleParams memory params2 = ISwapRouter.ExactInputSingleParams({
                    tokenIn: WMATIC,
                    tokenOut: WETH,
                    fee: 3000,
                    recipient: address(this),
                    amountIn: amountOut,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
                // approve dexRouter to spend WMATIC
                if (IERC20(WMATIC).allowance(address(this), address(dexRouter)) < amountOut) {
                    IERC20(WMATIC).approve(address(dexRouter), type(uint256).max);
                }
                amountOut = dexRouter.exactInputSingle(params2);
                // Swap WETH to PROFIT
                // uint256 wethBal = IERC20(WETH).balanceOf(address(this));
                ISwapRouter.ExactInputSingleParams memory params3 = ISwapRouter.ExactInputSingleParams({
                    tokenIn: WETH,
                    tokenOut: PROFIT,
                    fee: 3000,
                    recipient: address(splitter),
                    amountIn: amountOut,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
                // approve dexRouter to spend WETH
                if (IERC20(WETH).allowance(address(this), address(dexRouter)) < amountOut) {
                    IERC20(WETH).approve(address(dexRouter), type(uint256).max);
                }
                amountOut = dexRouter.exactInputSingle(params3);
                emit SwappedTokenForProfit(tokenIn.tokenToSwap, PROFIT, splitter, amountOut);
            }

            // If TOKEN is Paired with USDT
            if (v3Factory.getPool(tokenIn.tokenToSwap, USDT, tokenIn.poolFee) != address(0) && tokenBal > 0) {
                // Swap TOKEN to USDT
                ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn.tokenToSwap,
                    tokenOut: USDT,
                    fee: tokenIn.poolFee,
                    recipient: address(this),
                    amountIn: tokenBal,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
                // approve dexRouter to spend TOKEN
                if (IERC20(tokenIn.tokenToSwap).allowance(address(this), address(dexRouter)) < tokenBal) {
                    IERC20(tokenIn.tokenToSwap).approve(address(dexRouter), type(uint256).max);
                }
                amountOut = dexRouter.exactInputSingle(params);
                // Swap USDT to WETH
                // uint256 usdtBal = IERC20(USDT).balanceOf(address(this));
                ISwapRouter.ExactInputSingleParams memory params2 = ISwapRouter.ExactInputSingleParams({
                    tokenIn: USDT,
                    tokenOut: WETH,
                    fee: 3000,
                    recipient: address(this),
                    amountIn: amountOut,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
                // approve dexRouter to spend USDT
                if (IERC20(USDT).allowance(address(this), address(dexRouter)) < amountOut) {
                    IERC20(USDT).approve(address(dexRouter), type(uint256).max);
                }
                amountOut = dexRouter.exactInputSingle(params2);
                // Swap WETH to PROFIT
                // uint256 wethBal = IERC20(WETH).balanceOf(address(this));
                ISwapRouter.ExactInputSingleParams memory params3 = ISwapRouter.ExactInputSingleParams({
                    tokenIn: WETH,
                    tokenOut: PROFIT,
                    fee: 3000,
                    recipient: address(splitter),
                    amountIn: amountOut,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
                // approve dexRouter to spend WETH
                if (IERC20(WETH).allowance(address(this), address(dexRouter)) < amountOut) {
                    IERC20(WETH).approve(address(dexRouter), type(uint256).max);
                }
                amountOut = dexRouter.exactInputSingle(params3);
                emit SwappedTokenForProfit(tokenIn.tokenToSwap, PROFIT, splitter, amountOut);
            }
            */
            
        }
    }

    function withdraw(address _token, address _to, uint256 _amount) public onlyOwner {
        IERC20(_token).transfer(_to, _amount);
    }

}