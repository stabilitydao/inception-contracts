// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface ISplitter {
    function run(address token, address dPayer) external;
}
