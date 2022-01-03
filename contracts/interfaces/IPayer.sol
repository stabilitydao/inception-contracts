// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IPayer {
    function receivePayment(address sender, uint256 amount) external;
    function releasePayment() external virtual;
}