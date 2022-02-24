// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/swap-router-contracts/contracts/interfaces/IV3SwapRouter.sol";
import "@uniswap/swap-router-contracts/contracts/interfaces/IV2SwapRouter.sol";
import "../interfaces/ISplitter.sol";
import "../interfaces/IPayer.sol";

contract RevenueRouter is Ownable {
    address public PROFIT;
    address public BASE;
    uint24 public BASE_FEE;
    ISplitter public splitter;
    IPayer public profitPayer;
    IV3SwapRouter public v3Router;

    /**
     * @dev Route to swap revenue token to PROFIT on Uniswap V3 DEX
     */
    struct V3Route {
        // @dev revenue token which we need to swap to PROFIT
        address inputToken;

        // @dev output token can be BASE or paired with BASE token on v3Router pools
        address outputToken;

        // @dev input-output pair LP pool fee, used only when outputToken is not BASE
        uint24 poolFee;

        // @dev output-base pair LP pool fee, used only when outputToken is not BASE
        uint24 outputBasePoolFee;

        // @dev route can be decativated
        bool active;
    }

    /**
     * @dev Route to swap revenue token to other token on Uniswap V2 DEX
     */
    struct V2Route {
        // @dev revenue token which we need to swap to PROFIT
        address inputToken;

        // @dev output token can be BASE, paired with BASE token on v2Router or any V3Route input token
        address outputToken;

        // @dev Uniswap V2 router
        address v2Router;

        // @dev swap outputToken to BASE through this v2Router
        bool swapToBase;

        // @dev route can be decativated
        bool active;
    }

    V3Route[] public v3Routes;
    V2Route[] public v2Routes;

    event SwapToProfit(uint256 profitOut);
    event V3RouteAdded(address indexed inputToken, address indexed outputToken, uint24 poolFee, uint24 outputBasePoolFee_);
    event V3RouteUpdated(uint256 routeIndex, address inputToken, address outputToken, uint24 poolFee, uint24 outputBasePoolFee, bool active);
    event V3RouteDeleted(uint256 routeIndex);
    event V2RouteAdded(address indexed inputToken, address indexed outputToken, address indexed router);
    event V2RouteUpdated(uint256 routeIndex, address inputToken, address outputToken, address v2Router, bool active, bool swapToBase);
    event V2RouteDeleted(uint256 routeIndex);

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

    function totalV3Routes() external view returns (uint256) {
        return v3Routes.length;
    }

    function totalV2Routes() external view returns (uint256) {
        return v2Routes.length;
    }

    // Add a new token to list of tokens that can be swapped to PROFIT.
    function addV3Route(address inputToken_, address outputToken_, uint24 poolFee_, uint24 outputBasePoolFee_) external onlyOwner {
        v3Routes.push(
            V3Route({
        inputToken: inputToken_,
        outputToken: outputToken_,
        poolFee: poolFee_,
        outputBasePoolFee: outputBasePoolFee_,
        active: true
        })
        );

        emit V3RouteAdded(inputToken_, outputToken_, poolFee_, outputBasePoolFee_);
    }

    function addV2Route(address inputToken_, address outputToken_, address v2Router_, bool swapToBase_) external onlyOwner {
        v2Routes.push(
            V2Route({
        inputToken: inputToken_,
        outputToken: outputToken_,
        v2Router: v2Router_,
        swapToBase: swapToBase_,
        active: true
        })
        );

        emit V2RouteAdded(inputToken_, outputToken_, v2Router_);
    }

    // function to remove tokenIn (spends less gas)
    function deleteV3Route(uint256 index_) external onlyOwner {
        require(index_ < v3Routes.length, "index out of bound");
        v3Routes[index_] = v3Routes[v3Routes.length - 1];
        v3Routes.pop();

        emit V3RouteDeleted(index_);
    }

    function deleteV2Route(uint256 index_) external onlyOwner {
        require(index_ < v2Routes.length, "index out of bound");
        v2Routes[index_] = v2Routes[v2Routes.length - 1];
        v2Routes.pop();

        emit V2RouteDeleted(index_);
    }

    function updateV3Route(uint256 index_, address inputToken_, address outputToken_, uint24 poolFee_, uint24 outputBasePoolFee_, bool active_) external onlyOwner {
        v3Routes[index_].inputToken = inputToken_;
        v3Routes[index_].outputToken = outputToken_;
        v3Routes[index_].poolFee = poolFee_;
        v3Routes[index_].outputBasePoolFee = outputBasePoolFee_;
        v3Routes[index_].active = active_;
        emit V3RouteUpdated(index_, inputToken_, outputToken_, poolFee_, outputBasePoolFee_, active_);
    }

    function updateV2Route(uint256 index_,  address inputToken_, address outputToken_, address v2Router_, bool active_, bool swapToBase_) external onlyOwner {
        v2Routes[index_].inputToken = inputToken_;
        v2Routes[index_].outputToken = outputToken_;
        v2Routes[index_].v2Router = v2Router_;
        v2Routes[index_].swapToBase = swapToBase_;
        v2Routes[index_].active = active_;
        emit V2RouteUpdated(index_, inputToken_, outputToken_, v2Router_, active_, swapToBase_);
    }

    function run() external {
        swapTokens();
        splitter.run(address(PROFIT), address(profitPayer));
    }

    function swapTokens() public returns (uint256 amountOut) {
        uint256 amount;
        uint256 i;

        for (i = 0; i < v2Routes.length; i++) {
            V2Route storage v2route = v2Routes[i];

            if (v2route.active == false) {
                continue;
            }

            uint256 tokenBal = IERC20(v2route.inputToken).balanceOf(address(this));
            if (tokenBal > 0) {
                address[] memory path = new address[](2);
                path[0] = v2route.inputToken;
                path[1] = v2route.outputToken;
                if (IERC20(v2route.inputToken).allowance(address(this), v2route.v2Router) < tokenBal) {
                    TransferHelper.safeApprove(v2route.inputToken, v2route.v2Router, type(uint256).max);
                }

                amount = IV2SwapRouter(v2route.v2Router).swapExactTokensForTokens(tokenBal, 0, path, address(this));

                if (v2route.outputToken != BASE && v2route.swapToBase == true) {
                    path[0] = v2route.outputToken;
                    path[1] = BASE;
                    if (IERC20(v2route.outputToken).allowance(address(this), v2route.v2Router) < amount) {
                        TransferHelper.safeApprove(v2route.outputToken, v2route.v2Router, type(uint256).max);
                    }

                    amount = IV2SwapRouter(v2route.v2Router).swapExactTokensForTokens(amount, 0, path, address(this));
                }

                // Swap WETH to PROFIT on v3
                IV3SwapRouter.ExactInputSingleParams memory params2 = IV3SwapRouter.ExactInputSingleParams({
                tokenIn: BASE,
                tokenOut: PROFIT,
                fee: BASE_FEE,
                recipient: address(splitter),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
                });
                // approve dexRouter to spend WETH
                if (IERC20(BASE).allowance(address(this), address(v3Router)) < amount) {
                    TransferHelper.safeApprove(BASE, address(v3Router), type(uint256).max);
                }
                amountOut += v3Router.exactInputSingle(params2);
            }
        }

        for (i = 0; i < v3Routes.length; i++) {
            V3Route storage v3route = v3Routes[i];

            if (v3route.active == false) {
                continue;
            }

            uint256 tokenBal = IERC20(v3route.inputToken).balanceOf(address(this));

            if (tokenBal > 0) {
                // If TOKEN is Paired with BASE token (WETH now)
                if (v3route.outputToken == BASE) {
                    // Swap TOKEN to WETH
                    IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter.ExactInputSingleParams({
                    tokenIn: v3route.inputToken,
                    tokenOut: BASE,
                    fee: BASE_FEE,
                    recipient: address(this),
                    amountIn: tokenBal,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                    });

                    // approve dexRouter to spend tokens
                    if (IERC20(v3route.inputToken).allowance(address(this), address(v3Router)) < tokenBal) {
                        TransferHelper.safeApprove(v3route.inputToken, address(v3Router), type(uint256).max);
                    }

                    amount = v3Router.exactInputSingle(params);
                } else {
                    // TOKEN is Paired with v3route.outputToken
                    // Swap TOKEN to v3route.outputToken
                    IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter.ExactInputSingleParams({
                    tokenIn: v3route.inputToken,
                    tokenOut: v3route.outputToken,
                    fee: v3route.poolFee,
                    recipient: address(this),
                    amountIn: tokenBal,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                    });

                    // approve dexRouter to spend TOKEN
                    if (IERC20(v3route.inputToken).allowance(address(this), address(v3Router)) < tokenBal) {
                        TransferHelper.safeApprove(v3route.inputToken, address(v3Router), type(uint256).max);
                    }

                    amount = v3Router.exactInputSingle(params);

                    // Swap v3route.outputToken to BASE
                    // uint256 usdtBal = IERC20(USDT).balanceOf(address(this));
                    IV3SwapRouter.ExactInputSingleParams memory params2 = IV3SwapRouter.ExactInputSingleParams({
                    tokenIn: v3route.outputToken,
                    tokenOut: BASE,
                    fee: v3route.outputBasePoolFee,
                    recipient: address(this),
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                    });

                    // approve dexRouter to spend USDT
                    if (IERC20(v3route.outputToken).allowance(address(this), address(v3Router)) < amount) {
                        TransferHelper.safeApprove(v3route.outputToken, address(v3Router), type(uint256).max);
                    }

                    amount = v3Router.exactInputSingle(params2);
                }

                // Swap BASE to PROFIT
                // uint256 wethBal = IERC20(WETH).balanceOf(address(this));
                IV3SwapRouter.ExactInputSingleParams memory params3 = IV3SwapRouter.ExactInputSingleParams({
                tokenIn: BASE,
                tokenOut: PROFIT,
                fee: BASE_FEE,
                recipient: address(splitter),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
                });
                // approve dexRouter to spend WETH
                if (IERC20(BASE).allowance(address(this), address(v3Router)) < amount) {
                    TransferHelper.safeApprove(BASE, address(v3Router), type(uint256).max);
                }
                amountOut += v3Router.exactInputSingle(params3);
            }
        }

        if (amountOut > 0) {
            emit SwapToProfit(amountOut);
        }
    }

    function withdraw(address _token, address _to, uint256 _amount) public onlyOwner {
        IERC20(_token).transfer(_to, _amount);
    }

}