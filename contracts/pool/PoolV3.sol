// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

interface ERC20MintableBurnable is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

/**
 *  @dev This Contract Allows Users to Stake PROFIT
 *  tokens and receive ETH as reward for staking PROFIT.
 */
contract PoolV3 is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 ProfitToken; // Address of PROFIT token contract.
    ERC20MintableBurnable ProfitGenerationToken; // Address of gPROFIT token contract.
    IERC20 public WETH; // The REWARD TOKEN!

    uint256 lastRewardBlock; // Last block number that WETHs distribution occurs.
    uint256 accWETHPerShare; // Accumulated WETHs per share, times 1e12.

    /** @notice Divisor. This plays an important
     *  role in determining the amount of ETH that
     *  will be distributed per block from the
     *  total ETH balance of the pool.
     */
    uint256 divisor = 100000; // This is 0.001% of the total ETH in the pool.

    // Info of each user that stakes PROFIT tokens.

    // Info of reward debt for each staker
    mapping(address => uint256) public rewardDebt;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    constructor(
        IERC20 _WETH,
        IERC20 _ProfitToken,
        ERC20MintableBurnable _ProfitGenerationToken
    ) {
        WETH = _WETH;
        uint256 _lastRewardBlock = block.number;
        ProfitToken = _ProfitToken;
        ProfitGenerationToken = _ProfitGenerationToken;
        lastRewardBlock = _lastRewardBlock;
        accWETHPerShare = 0;
    }

    // View function to see pending WETHs on frontend.
    function pendingWETH(address _user) internal view returns (uint256) {
        uint256 reward = rewardDebt[_user];
        uint256 blocks = block.number.sub(lastRewardBlock);
        uint256 acc = accWETHPerShare;
        uint256 lpSupply = IERC20(ProfitToken).balanceOf(address(this));
        if (block.number > lastRewardBlock && lpSupply != 0) {
            uint256 WETHBal = WETH.balanceOf(address(this));
            uint256 WETHReward = blocks.mul(WETHBal).div(divisor);
            acc = acc.add(WETHReward.mul(1e12).div(lpSupply));
        }
        uint256 userAmount = IERC20(ProfitGenerationToken).balanceOf(_user);
        return userAmount.mul(acc).div(1e12).sub(reward);
    }

    /** @notice Update reward variables of the pool.
     */
    function update() public {
        if (block.number <= lastRewardBlock) {
            return;
        }
        uint256 lpSupply = ProfitToken.balanceOf(address(this));
        if (lpSupply == 0) {
            lastRewardBlock = block.number;
            return;
        }

        uint256 blocks = block.number.sub(lastRewardBlock);
        uint256 WETHBal = WETH.balanceOf(address(this));
        uint256 WETHReward = blocks.mul(WETHBal).div(divisor);
        accWETHPerShare = accWETHPerShare.add(
            WETHReward.mul(1e12).div(lpSupply)
        );
        lastRewardBlock = block.number;
    }

    // Stake PROFIT tokens to Pool to get rewarded with ETH.
    function stake(uint256 _amount) public {
        uint256 reward = rewardDebt[msg.sender];
        update();

        uint256 userAmount = IERC20(ProfitGenerationToken).balanceOf(msg.sender);

        if (userAmount > 0) {
            uint256 pending = userAmount.mul(accWETHPerShare).div(1e12).sub(
                reward
            );
            safeWETHTransfer(msg.sender, pending);
        }

        ProfitToken.safeTransferFrom(
            address(msg.sender),
            address(this),
            _amount
        );

        ProfitGenerationToken.mint(
            address(msg.sender),
                _amount
        );

        uint256 newUserAmount = userAmount.add(_amount);
        reward = newUserAmount.mul(accWETHPerShare).div(1e12);
        emit Deposit(msg.sender, _amount);
    }

    /** @notice Harvest Function is a funtion that allows
     *  the user to harvest pending ETH rewards without unstaking.
     *  It simply a funtion that calls the stake()
     *  function with zero deposit amount.
     */
    function harvest() public {
        stake(0);
    }

    /** @notice Unstake PROFIT tokens from Pool and harvest pending ETH rewards.
     *  @param _amount PROFIT token amount to withdraw.
     */
    function unstake(uint256 _amount) public {
        uint256 reward = rewardDebt[msg.sender];
        uint256 userAmount = IERC20(ProfitGenerationToken).balanceOf(msg.sender);
        require(userAmount >= _amount, 'withdraw: not good');
        update();
        uint256 pending = userAmount.mul(accWETHPerShare).div(1e12).sub(
            reward
        );
        // Interactions
        safeWETHTransfer(msg.sender, pending);
        // Effects
        uint256 newUserAmount = userAmount.sub(_amount);
        reward = newUserAmount.mul(accWETHPerShare).div(1e12);
        // Interactions
        ProfitToken.safeTransfer(address(msg.sender), _amount);
        ProfitGenerationToken.burn(
            address(msg.sender),
            _amount
        );
        emit Withdraw(msg.sender, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw() public {
        uint256 reward = rewardDebt[msg.sender];

        uint256 userAmount = IERC20(ProfitGenerationToken).balanceOf(msg.sender);

        ProfitToken.safeTransfer(address(msg.sender), userAmount);

        ProfitGenerationToken.burn(
            address(msg.sender),
            userAmount
        );

        emit EmergencyWithdraw(msg.sender, userAmount);

        reward = 0;
    }

    // Safe WETH transfer function, just in case if rounding error causes pool to not have enough WETHs.
    function safeWETHTransfer(address _to, uint256 _amount) internal {
        uint256 WETHBal = WETH.balanceOf(address(this));
        if (_amount > WETHBal) {
            WETH.safeTransfer(_to, WETHBal);
        } else {
            WETH.safeTransfer(_to, _amount);
        }
    }

    function setDivisor(uint256 _divisor) public onlyOwner {
        divisor = _divisor;
    }
}
