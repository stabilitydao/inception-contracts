// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

/*
 * @title MetaRouter
 * @dev Contract swaps tokens and native coin through whitelisted routers: DeX routers, aggregators, mint/burn contracts.
 */
contract MetaRouter is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");

    address payable private feeTo;
    uint64 private fee; // 10 - 0.1%
    address[] private noFeeNFTs;

    event Swap(
        address indexed user,
        address indexed router,
        address sellToken,
        address buyToken,
        uint256 soldAmount,
        uint256 boughtAmount
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
    }

    receive() external payable {}

    function initialize(address payable feeTo_, uint64 fee_) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        feeTo = feeTo_;
        fee = fee_;
    }

    function swap(
        IERC20Upgradeable sellToken,
        IERC20Upgradeable buyToken,
        uint256 amount,
        address router,
        bytes calldata swapCalldata
    ) external payable {
        require(hasRole(ROUTER_ROLE, router), "Not whitelisted router");

        bool sellsNative = address(sellToken) == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
        bool buysNative = address(buyToken) == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
        bool isFee = isFeeOn();

        if (sellsNative) {
            require(msg.value >= amount);
        } else {
            sellToken.transferFrom(msg.sender, address(this), amount);

            if (sellToken.allowance(address(this), router) == uint256(0)) {
                sellToken.approve(router, type(uint256).max);
            }
        }

        (bool success,) = router.call{value: msg.value}(swapCalldata);

        require(success, "SWAP_CALL_FAILED");

        uint256 boughtAmount;
        uint256 feeAmount;

        if (buysNative) {
            boughtAmount = address (this).balance;
        } else {
            boughtAmount = buyToken.balanceOf(address(this));
        }

        if (isFee) {
            feeAmount = boughtAmount * fee / 10000;
            boughtAmount -= feeAmount;
        }

        if (buysNative) {
            if (isFee) {
                (bool sent,) = feeTo.call{value: feeAmount}("");
                require(sent, "Failed to send Ether to feeTo");
            }
            (bool sent,) = msg.sender.call{value: address (this).balance}("");
            require(sent, "Failed to send Ether to user");
        } else {
            if (isFee) {
                buyToken.transfer(feeTo, feeAmount);
            }
            buyToken.transfer(msg.sender, boughtAmount);
        }

        emit Swap(msg.sender, router, address(sellToken), address (buyToken), amount, boughtAmount);
    }

    function isFeeOn() private returns (bool) {
        uint256 length = noFeeNFTs.length;
        for(uint i; i < length; i++) {
            if (ERC721Upgradeable(noFeeNFTs[i]).balanceOf(msg.sender) > 0) {
                return false;
            }
        }

        return true;
    }

    function setup(address payable feeTo_, uint64 fee_, address addNft) external onlyRole(UPGRADER_ROLE) {
        feeTo = feeTo_;
        fee = fee_;
        if (addNft != address (0)) {
            noFeeNFTs.push(addNft);
        }
    }

    function _authorizeUpgrade(address newImplementation) internal onlyRole(UPGRADER_ROLE) override {
        // solhint-disable-previous-line no-empty-blocks
    }
}