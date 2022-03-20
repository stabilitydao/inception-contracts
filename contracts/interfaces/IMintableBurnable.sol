// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IMintableBurnable {
  function mint(address to, uint amount) external;
  function burn(address owner, uint amount) external;
}
