// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/draft-ERC721VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

/**
 * @dev Custom extension of {Governor} for voting weight extraction from an {ERC20Votes} and {ERC721Votes} multiple token.
 *
 */
abstract contract GovVotes is Initializable, GovernorUpgradeable {
    using SafeMathUpgradeable for uint256;

    struct GovFT {
        ERC20VotesUpgradeable token;
        uint256 multiplier;
    }

    struct GovNFT {
        ERC721VotesUpgradeable token;
        uint256 multiplier;
    }

    GovFT[] public govFT;
    GovNFT[] public govNFT;

    function getVotes(address account, uint256 blockNumber) public view virtual override returns (uint256) {
        uint256 votes;
        uint256 length = govFT.length;

        // todo gas optimization
        for (uint256 i; i < length; i++) {
            votes += govFT[i].token.getPastVotes(account, blockNumber).mul(govFT[i].multiplier);
        }

        length = govNFT.length;

        for (uint256 i; i < length; i++) {
            votes += govNFT[i].token.getPastVotes(account, blockNumber).mul(govNFT[i].multiplier);
        }

        return votes.div(1000);
    }

    function __GovVotes_init(ERC20VotesUpgradeable tokenAddress) internal initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __IGovernor_init_unchained();
        __GovernorVotes_init_unchained(tokenAddress);
    }

    function __GovernorVotes_init_unchained(ERC20VotesUpgradeable tokenAddress) internal initializer {
        govFT.push(GovFT({
            token: tokenAddress,
            multiplier: 1 * 1000 // 1x == 1000
        }));
    }

    function _addFT(ERC20VotesUpgradeable token, uint256 multiplier) internal virtual {
        govFT.push(GovFT({
        token: token,
        multiplier: multiplier // 1x == 1000
        }));
    }

    function _setFTMultiplier(uint256 id, uint256 multiplier) internal virtual {
        govFT[id].multiplier = multiplier;
    }

    function _addNFT(ERC721VotesUpgradeable token, uint256 multiplier) internal virtual {
        govNFT.push(GovNFT({
        token: token,
        multiplier: multiplier // 1x == 1000
        }));
    }

    function _setNFTMultiplier(uint256 id, uint256 multiplier) internal virtual {
        govNFT[id].multiplier = multiplier;
    }

    uint256[50] private __gap;
}
