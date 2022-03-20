// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '../utils/SyntheticTokenBase.sol';

contract Profit is SyntheticTokenBase {
  constructor() SyntheticTokenBase('Stability', 'PROFIT') {}
}
