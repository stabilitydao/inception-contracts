// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IPool.sol";
import "../token/IERC20MintableUpgradeable.sol";

/**
 * @title Bsae minting upgradeable pool contract
 * @dev Was inspired by the Masterchef contract
 */
abstract contract MintingPool is IPool, Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    // Staking token
    IERC20Upgradeable public stakeToken;

    // Reward token
    IERC20MintableUpgradeable public rewardToken;

    // Reward tokens created per block.
    uint256 public rewardTokensPerBlock;

    // Last block number that reward tokens distribution occurs.
    uint256 public lastRewardBlock;

    // Accumulated RewardTokens per share, times 1e12.
    uint256 public accRewardTokensPerShare;

    // The block number when RewardToken mining starts.
    uint256 public startBlock;

    // Info of each user that stakes LP tokens.
    mapping (address => UserInfo) public userInfo;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    // solhint-disable-next-line func-name-mixedcase
    function __MintingPool_init(
        IERC20Upgradeable _stakeToken,
        IERC20MintableUpgradeable _rewardToken,
        uint256 _rewardTokensPerBlock,
        uint256 _startBlock
    ) internal initializer {
        stakeToken = _stakeToken;
        rewardToken = _rewardToken;
        rewardTokensPerBlock = _rewardTokensPerBlock;
        startBlock = _startBlock;
        lastRewardBlock = startBlock;

        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public pure returns (uint256) {
        return _to.sub(_from);
    }

    // View function to see pending RewardTokens on frontend.
    function pending(address _user) external view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        uint256 accRewardPerShare = accRewardTokensPerShare;
        uint256 totalStaked = stakeToken.balanceOf(address(this));
        if (block.number > lastRewardBlock && totalStaked != 0) {
            uint256 multiplier = getMultiplier(lastRewardBlock, block.number);
            uint256 reward = multiplier.mul(rewardTokensPerBlock);
            accRewardPerShare = accRewardPerShare.add(reward.mul(1e12).div(totalStaked));
        }
        return user.amount.mul(accRewardPerShare).div(1e12).sub(user.rewardDebt);
    }

    // Update reward variables to be up-to-date.
    function update() public {
        if (block.number <= lastRewardBlock) {
            return;
        }

        uint256 lpSupply = stakeToken.balanceOf(address(this));

        if (lpSupply == 0) {
            lastRewardBlock = block.number;
            return;
        }

        uint256 multiplier = getMultiplier(lastRewardBlock, block.number);
        uint256 reward = multiplier.mul(rewardTokensPerBlock);
        rewardToken.mint(address(this), reward);
        accRewardTokensPerShare = accRewardTokensPerShare.add(reward.mul(1e12).div(lpSupply));
        lastRewardBlock = block.number;
    }

    // Stake StakeTokens to MintingPool
    function stake(uint256 _amount) public {
        UserInfo storage user = userInfo[msg.sender];

        update();

        if (user.amount > 0) {
            uint256 pendingReward = user.amount.mul(accRewardTokensPerShare).div(1e12).sub(user.rewardDebt);

            if(pendingReward > 0) {
                safeRewardTransfer(msg.sender, pendingReward);
            }
        }

        if(_amount > 0) {
            stakeToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
        }

        user.rewardDebt = user.amount.mul(accRewardTokensPerShare).div(1e12);

        emit Deposit(msg.sender, _amount);
    }

    // Unstake StakeTokens
    function unstake(uint256 _amount) public {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "unstake: not enough user amount");
        update();
        uint256 pendingReward = user.amount.mul(accRewardTokensPerShare).div(1e12).sub(user.rewardDebt);
        if(pendingReward > 0) {
            safeRewardTransfer(msg.sender, pendingReward);
        }
        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            stakeToken.safeTransfer(address(msg.sender), _amount);
        }
        user.rewardDebt = user.amount.mul(accRewardTokensPerShare).div(1e12);

        emit Withdraw(msg.sender, _amount);
    }

    function harvest() external {
        stake(0);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw() public {
        UserInfo storage user = userInfo[msg.sender];
        stakeToken.safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    // Safe rewardToken transfer function, just in case if rounding error causes pool to not have enough RewardTokens.
    function safeRewardTransfer(address _to, uint256 _amount) internal {
        uint256 rewardBal = rewardToken.balanceOf(address(this));
        if (_amount > rewardBal) {
            rewardToken.transfer(_to, rewardBal);
        } else {
            rewardToken.transfer(_to, _amount);
        }
    }

    function _authorizeUpgrade(address newImplementation) internal onlyOwner override {
        // solhint-disable-previous-line no-empty-blocks
    }
}