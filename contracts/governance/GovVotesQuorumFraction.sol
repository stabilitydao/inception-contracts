// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./GovVotes.sol";

/**
 * @dev Extension of {Governor} for voting weight extraction from an {ERC20Votes} token and a quorum expressed as a
 * fraction of the total supply.
 *
 * _Available since v4.3._
 */
abstract contract GovVotesQuorumFraction is Initializable, GovVotes {
    using SafeMathUpgradeable for uint256;

    uint256 private _quorumNumerator;

    event QuorumNumeratorUpdated(uint256 oldQuorumNumerator, uint256 newQuorumNumerator);

    function __GovVotesQuorumFraction_init(uint256 quorumNumeratorValue) internal onlyInitializing {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __IGovernor_init_unchained();
        __GovVotesQuorumFraction_init_unchained(quorumNumeratorValue);
    }

    function __GovVotesQuorumFraction_init_unchained(uint256 quorumNumeratorValue) internal onlyInitializing {
        _updateQuorumNumerator(quorumNumeratorValue);
    }

    function quorumNumerator() public view virtual returns (uint256) {
        return _quorumNumerator;
    }

    function quorumDenominator() public view virtual returns (uint256) {
        return 100;
    }

    function quorum(uint256 blockNumber) public view virtual override returns (uint256) {
        uint256 totalSupply;
        uint256 length = govFT.length;
        for (uint256 i; i < length; i++) {
            totalSupply += govFT[i].token.getPastTotalSupply(blockNumber).mul(govFT[i].multiplier).div(1000);
        }

        length = govNFT.length;
        for (uint256 i; i < length; i++) {
            totalSupply += govNFT[i].token.getPastTotalSupply(blockNumber).mul(govNFT[i].multiplier).div(1000);
        }

        return (totalSupply * quorumNumerator()) / quorumDenominator();
    }

    function updateQuorumNumerator(uint256 newQuorumNumerator) external virtual onlyGovernance {
        _updateQuorumNumerator(newQuorumNumerator);
    }

    function _updateQuorumNumerator(uint256 newQuorumNumerator) internal virtual {
        require(
            newQuorumNumerator <= quorumDenominator(),
            "GovVotesQuorumFraction: quorumNumerator over quorumDenominator"
        );

        uint256 oldQuorumNumerator = _quorumNumerator;
        _quorumNumerator = newQuorumNumerator;

        emit QuorumNumeratorUpdated(oldQuorumNumerator, newQuorumNumerator);
    }
    uint256[49] private __gap;
}
