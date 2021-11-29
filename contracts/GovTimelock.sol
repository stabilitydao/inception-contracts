// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-4.4/governance/TimelockController.sol";

contract GovTimelock is TimelockController {
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors
    )
        TimelockController(minDelay, proposers, executors)
        // solhint-disable-next-line no-empty-blocks
    {}
}