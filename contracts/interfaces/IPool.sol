// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title Staking pool interface
 */
interface IPool {
    /**
    * @dev Info of each user
    */
    struct UserInfo {
        /**
         * @dev How many stake tokens the user has provided.
         */
        uint256 amount;

        /**
         * @dev Reward debt
         */
        uint256 rewardDebt;
    }

    /**
     * @dev Deposit stake tokens to pool
     */
    function stake(uint256 _amount) external;

    /**
     * @dev Withdraw stake tokens
     */
    function unstake(uint256 _amount) external;

    /**
     * @dev Pending reward
     */
    function pending(address _user) external view returns (uint256);

    /**
     * @dev Collect pending reward
     */
    function harvest() external;
}