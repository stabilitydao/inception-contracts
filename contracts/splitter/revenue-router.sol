// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

library TransferHelper {
    /// @notice Transfers tokens from the targeted address to the given destination
    /// @notice Errors with 'STF' if transfer fails
    /// @param token The contract address of the token to be transferred
    /// @param from The originating address from which the tokens will be transferred
    /// @param to The destination address of the transfer
    /// @param value The amount to be transferred
    function safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {
        (bool success, bytes memory data) =
            token.call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'STF');
    }

    /// @notice Transfers tokens from msg.sender to a recipient
    /// @dev Errors with ST if transfer fails
    /// @param token The contract address of the token which will be transferred
    /// @param to The recipient of the transfer
    /// @param value The value of the transfer
    function safeTransfer(
        address token,
        address to,
        uint256 value
    ) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transfer.selector, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'ST');
    }

    /// @notice Approves the stipulated contract to spend the given allowance in the given token
    /// @dev Errors with 'SA' if transfer fails
    /// @param token The contract address of the token to be approved
    /// @param to The target of the approval
    /// @param value The amount of the given token the target will be allowed to spend
    function safeApprove(
        address token,
        address to,
        uint256 value
    ) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.approve.selector, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'SA');
    }

    /// @notice Transfers ETH to the recipient address
    /// @dev Fails with `STE`
    /// @param to The destination of the transfer
    /// @param value The value to be transferred
    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, 'STE');
    }
}

/// @title The interface for the Uniswap V3 Factory
/// @notice The Uniswap V3 Factory facilitates creation of Uniswap V3 pools and control over the protocol fees
interface IUniswapV3Factory {
    /// @notice Emitted when the owner of the factory is changed
    /// @param oldOwner The owner before the owner was changed
    /// @param newOwner The owner after the owner was changed
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    /// @notice Emitted when a pool is created
    /// @param token0 The first token of the pool by address sort order
    /// @param token1 The second token of the pool by address sort order
    /// @param fee The fee collected upon every swap in the pool, denominated in hundredths of a bip
    /// @param tickSpacing The minimum number of ticks between initialized ticks
    /// @param pool The address of the created pool
    event PoolCreated(
        address indexed token0,
        address indexed token1,
        uint24 indexed fee,
        int24 tickSpacing,
        address pool
    );

    /// @notice Emitted when a new fee amount is enabled for pool creation via the factory
    /// @param fee The enabled fee, denominated in hundredths of a bip
    /// @param tickSpacing The minimum number of ticks between initialized ticks for pools created with the given fee
    event FeeAmountEnabled(uint24 indexed fee, int24 indexed tickSpacing);

    /// @notice Returns the current owner of the factory
    /// @dev Can be changed by the current owner via setOwner
    /// @return The address of the factory owner
    function owner() external view returns (address);

    /// @notice Returns the tick spacing for a given fee amount, if enabled, or 0 if not enabled
    /// @dev A fee amount can never be removed, so this value should be hard coded or cached in the calling context
    /// @param fee The enabled fee, denominated in hundredths of a bip. Returns 0 in case of unenabled fee
    /// @return The tick spacing
    function feeAmountTickSpacing(uint24 fee) external view returns (int24);

    /// @notice Returns the pool address for a given pair of tokens and a fee, or address 0 if it does not exist
    /// @dev tokenA and tokenB may be passed in either token0/token1 or token1/token0 order
    /// @param tokenA The contract address of either token0 or token1
    /// @param tokenB The contract address of the other token
    /// @param fee The fee collected upon every swap in the pool, denominated in hundredths of a bip
    /// @return pool The pool address
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);

    /// @notice Creates a pool for the given two tokens and fee
    /// @param tokenA One of the two tokens in the desired pool
    /// @param tokenB The other of the two tokens in the desired pool
    /// @param fee The desired fee for the pool
    /// @dev tokenA and tokenB may be passed in either order: token0/token1 or token1/token0. tickSpacing is retrieved
    /// from the fee. The call will revert if the pool already exists, the fee is invalid, or the token arguments
    /// are invalid.
    /// @return pool The address of the newly created pool
    function createPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external returns (address pool);

    /// @notice Updates the owner of the factory
    /// @dev Must be called by the current owner
    /// @param _owner The new owner of the factory
    function setOwner(address _owner) external;

    /// @notice Enables a fee amount with the given tickSpacing
    /// @dev Fee amounts may never be removed once enabled
    /// @param fee The fee amount to enable, denominated in hundredths of a bip (i.e. 1e-6)
    /// @param tickSpacing The spacing between ticks to be enforced for all pools created with the given fee amount
    function enableFeeAmount(uint24 fee, int24 tickSpacing) external;
}

interface IUniswapV3SwapCallback {
    /// @notice Called to `msg.sender` after executing a swap via IUniswapV3Pool#swap.
    /// @dev In the implementation you must pay the pool tokens owed for the swap.
    /// The caller of this method must be checked to be a UniswapV3Pool deployed by the canonical UniswapV3Factory.
    /// amount0Delta and amount1Delta can both be 0 if no tokens were swapped.
    /// @param amount0Delta The amount of token0 that was sent (negative) or must be received (positive) by the pool by
    /// the end of the swap. If positive, the callback must send that amount of token0 to the pool.
    /// @param amount1Delta The amount of token1 that was sent (negative) or must be received (positive) by the pool by
    /// the end of the swap. If positive, the callback must send that amount of token1 to the pool.
    /// @param data Any data passed through by the caller via the IUniswapV3PoolActions#swap call
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external;
}

/// @title Router token swapping functionality
/// @notice Functions for swapping tokens via Uniswap V3
interface ISwapRouter is IUniswapV3SwapCallback {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    /// @notice Swaps `amountIn` of one token for as much as possible of another token
    /// @param params The parameters necessary for the swap, encoded as `ExactInputSingleParams` in calldata
    /// @return amountOut The amount of the received token
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    /// @notice Swaps `amountIn` of one token for as much as possible of another along the specified path
    /// @param params The parameters necessary for the multi-hop swap, encoded as `ExactInputParams` in calldata
    /// @return amountOut The amount of the received token
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

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
    IUniswapV3Factory public v3Factory;

    event SwappedTokenForProfit(address tokenIn, address tokenOut, address recipient, uint256 amountOut);
    event NewInputTokenAdded(address tokenIn, uint24 poolFee);

    constructor (
        address _PROFIT,
        address _WETH,
        address _WMATIC,
        address _USDT,
        ISwapRouter _dexRouter,
        IUniswapV3Factory _v3Factory,
        address _splitter
    ) {
        PROFIT = _PROFIT;
        WETH = _WETH;
        WMATIC = _WMATIC;
        USDT = _USDT;
        dexRouter = _dexRouter;
        v3Factory = _v3Factory;
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
            if (v3Factory.getPool(tokenIn.tokenToSwap, WETH, tokenIn.poolFee) != address(0) && tokenBal > 0) {
                // Swap TOKEN to WETH
                ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn.tokenToSwap,
                    tokenOut: WETH,
                    fee: tokenIn.poolFee,
                    recipient: address(this),
                    amountIn: tokenBal,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
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
                    sqrtPriceLimitX96: 0
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