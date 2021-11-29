// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

/**
 *  @dev This Contract Allows Users to Stake PROFIT
 *  tokens and receive ETH as reward for staking PROFIT.
 */
contract Pool is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many PROFIT tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of WETHs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * accWETHPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws PROFIT tokens to a pool. Here's what happens:
        //   1. The pool's `accWETHPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // Address of PROFIT token contract.
    IERC20 public immutable profitToken;

    // The REWARD TOKEN!
    IERC20 public immutable wETH;

    uint256 private lastRewardBlock; // Last block number that WETHs distribution occurs.
    uint256 private accWETHPerShare; // Accumulated WETHs per share, times 1e12.

    /** @notice Divisor. This plays an important
     *  role in determining the amount of ETH that
     *  will be distributed per block from the
     *  total ETH balance of the pool.
     */
    uint256 public divisor = 100000; // This is 0.001% of the total ETH in the pool.

    // Info of each user that stakes PROFIT tokens.
    mapping(address => UserInfo) public userInfo;
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    constructor(
        IERC20 _wETH,
        IERC20 _profitToken
    ) {
        wETH = _wETH;
        uint256 _lastRewardBlock = block.number;
        profitToken = _profitToken;
        lastRewardBlock = _lastRewardBlock;
        accWETHPerShare = 0;
    }

    // View function to see pending WETHs on frontend.
    function pendingWETH(address _user) external view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        uint256 blocks = block.number.sub(lastRewardBlock);
        uint256 acc = accWETHPerShare;
        uint256 lpSupply = IERC20(profitToken).balanceOf(address(this));
        if (block.number > lastRewardBlock && lpSupply != 0) {
            uint256 wETHBal = wETH.balanceOf(address(this));
            uint256 wETHReward = blocks.mul(wETHBal).div(divisor);
            acc = acc.add(wETHReward.mul(1e12).div(lpSupply));
        }
        return user.amount.mul(acc).div(1e12).sub(user.rewardDebt);
    }

    /** @notice Update reward variables of the pool.
     */
    function update() public {
        if (block.number <= lastRewardBlock) {
            return;
        }
        uint256 lpSupply = profitToken.balanceOf(address(this));
        if (lpSupply == 0) {
            lastRewardBlock = block.number;
            return;
        }

        uint256 blocks = block.number.sub(lastRewardBlock);
        uint256 wETHBal = wETH.balanceOf(address(this));
        uint256 wETHReward = blocks.mul(wETHBal).div(divisor);
        accWETHPerShare = accWETHPerShare.add(
            wETHReward.mul(1e12).div(lpSupply)
        );
        lastRewardBlock = block.number;
    }

    // Stake PROFIT tokens to Pool to get rewarded with ETH.
    function stake(uint256 _amount) public {
        UserInfo storage user = userInfo[msg.sender];
        update();
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(accWETHPerShare).div(1e12).sub(
                user.rewardDebt
            );
            safeWETHTransfer(msg.sender, pending);
        }
        profitToken.safeTransferFrom(
            address(msg.sender),
            address(this),
            _amount
        );
        user.amount = user.amount.add(_amount);
        user.rewardDebt = user.amount.mul(accWETHPerShare).div(1e12);
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
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, 'withdraw: not good');
        update();
        uint256 pending = user.amount.mul(accWETHPerShare).div(1e12).sub(
            user.rewardDebt
        );
        // Interactions
        safeWETHTransfer(msg.sender, pending);
        // Effects
        user.amount = user.amount.sub(_amount);
        user.rewardDebt = user.amount.mul(accWETHPerShare).div(1e12);
        // Interactions
        profitToken.safeTransfer(address(msg.sender), _amount);
        emit Withdraw(msg.sender, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw() public {
        UserInfo storage user = userInfo[msg.sender];
        profitToken.safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    // Safe WETH transfer function, just in case if rounding error causes pool to not have enough WETHs.
    function safeWETHTransfer(address _to, uint256 _amount) internal {
        uint256 wETHBal = wETH.balanceOf(address(this));
        if (_amount > wETHBal) {
            wETH.safeTransfer(_to, wETHBal);
        } else {
            wETH.safeTransfer(_to, _amount);
        }
    }

    function setDivisor(uint256 _divisor) public onlyOwner {
        divisor = _divisor;
    }
}
