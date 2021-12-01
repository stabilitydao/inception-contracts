// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title Staking pool interface
 * @dev Designed to help front-end builders
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

    function stake(uint256 _amount) external;
    function unstake(uint256 _amount) external;
    function pending(address _user) external view returns (uint256);
    function harvest() external;
    function update() external;
}