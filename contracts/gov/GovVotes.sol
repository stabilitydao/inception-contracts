// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @dev Custom extension of {Governor} for voting weight extraction from two {ERC20Votes} tokens.
 */
abstract contract GovVotes is Governor {
    using SafeMath for uint256;

    ERC20Votes public immutable token;
    ERC20Votes public immutable gToken;

    constructor(ERC20Votes tokenAddress, ERC20Votes gTokenAddress) {
        token = tokenAddress;
        gToken = gTokenAddress;
    }

    function getVotes(address account, uint256 blockNumber) public view virtual override returns (uint256) {
        return token.getPastVotes(account, blockNumber).add(gToken.getPastVotes(account, blockNumber));
    }
}
