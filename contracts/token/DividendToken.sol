// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./IERC20MintableUpgradeable.sol";
import "../proxy/Upgradeable.sol";

contract DividendToken is IERC20MintableUpgradeable, ERC20BurnableUpgradeable, ERC20SnapshotUpgradeable, ERC20PermitUpgradeable, Upgradeable {
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
    }

    function initialize(address developmentFund) public initializer {
        __ERC20_init("Stability Dividend", "SDIV");
        __ERC20Burnable_init();
        __ERC20Snapshot_init();
        __ERC20Permit_init("Stability Dividend");

        __Upgradeable_init(msg.sender, developmentFund);
        _grantRole(SNAPSHOT_ROLE, developmentFund);
    }

    function snapshot() public onlyRole(SNAPSHOT_ROLE) returns(uint256) {
        return _snapshot();
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    // The following functions are overrides required by Solidity.
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override(ERC20Upgradeable, ERC20SnapshotUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}