// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/draft-ERC721VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

contract ProfitMaker is Initializable, ERC721Upgradeable, ERC721VotesUpgradeable, ERC721EnumerableUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    event Harvest(address indexed token, address recipient, uint256 amount);
    event Released(address indexed token, uint256 amount);
    event SetMintTime(uint64 from, uint64 to);

    IERC20Upgradeable public _profitToken;
    uint64 public mintingStart;
    uint64 public mintingEnd;

    struct Unlock {
        uint64 start;
        uint64 duration;
        uint256 released;
        uint256[] userBalance;
    }

    mapping(address => Unlock) public unlocks;

    CountersUpgradeable.Counter private _tokenIdCounter;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(IERC20Upgradeable profitToken_) initializer public {
        _profitToken = profitToken_;
        __ERC721_init("Profit Maker", "PM");
        __ERC721Enumerable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://api.stabilitydao.org/maker/";
    }

    function safeMint(address to) public {
        require(_profitToken.balanceOf(msg.sender) >= 10000 ether, "Not enough PROFIT tokens");
        require(mintingStart <= uint64(block.timestamp), "Mint is not available right now");
        require(mintingEnd >= uint64(block.timestamp), "Mint is not available right now");
        uint256 tokenId = _tokenIdCounter.current();
        require(tokenId < 80, "All tokens have already been minted");
        _profitToken.transferFrom(msg.sender, address(this), 10000 ether);
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
    }

    /**
     * @dev Amount of token already released
     */
    function released(address token) public view virtual returns (uint256) {
        return unlocks[token].released;
    }

    /**
     * @dev Withdraw user balance
     */
    function harvest(address token_, uint256 tokenId_) public {
        require(ownerOf(tokenId_) == msg.sender, "You are not owner of token.");
        require(unlocks[token_].start > 0, "Token dont have unlock.");
        uint256 releasable = unlocks[token_].userBalance[tokenId_];
        require(releasable > 0, "No tokens to harvest");
        unlocks[token_].userBalance[tokenId_] = 0;
        SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(token_), msg.sender, releasable);
    }

    /**
     * @dev Release the tokens that have already vested.
     *
     * Emits a {Released} event.
     */
    function releaseToBalance(address token) public {
        uint256 releasable = vestedAmount(token, uint64(block.timestamp)) - released(token);
        unlocks[token].released += releasable;

        uint256 totalUsers = _tokenIdCounter.current();
        for (uint256 i; i <= totalUsers; i++) {
            unlocks[token].userBalance[i] += releasable / totalUsers;
        }

        emit Released(token, releasable);
    }

    /**
     * @dev Calculates the amount of tokens that has already vested. Default implementation is a linear vesting curve.
     */
    function vestedAmount(address token, uint64 timestamp) public view virtual returns (uint256) {
        return _vestingSchedule(token, IERC20Upgradeable(token).balanceOf(address(this)) + released(token), timestamp);
    }

    /**
     * @dev Virtual implementation of the vesting formula. This returns the amout vested, as a function of time, for
     * an asset given its total historical allocation.
     */
    function _vestingSchedule(address token, uint256 totalAllocation, uint64 timestamp) internal view virtual returns (uint256) {
        if (unlocks[token].start == 0 || timestamp < unlocks[token].start) {
            return 0;
        } else if (timestamp > unlocks[token].start + unlocks[token].duration) {
            return totalAllocation;
        } else {
            return (totalAllocation * (timestamp - unlocks[token].start)) / unlocks[token].duration;
        }
    }

    function setMintState(uint64 start_, uint64 end_) public onlyOwner {
        mintingStart = start_;
        mintingEnd = end_;
        emit SetMintTime(start_, end_);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyOwner
    override
    {}

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
    internal
    override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Upgradeable, ERC721VotesUpgradeable) {
        super._afterTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
