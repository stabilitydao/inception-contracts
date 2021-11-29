// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract ProfitGenerationToken is ERC20, AccessControl, ERC20Permit, ERC20Votes {
    bytes32 public constant MINTER_BURNER_ROLE = keccak256("MINTER_BURNER_ROLE");

    constructor() ERC20("Profit Generation", "gPROFIT") ERC20Permit("Profit Generation") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_BURNER_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyRole(MINTER_BURNER_ROLE) {
        _burn(from, amount);
    }

    // The following functions are overrides required by Solidity.
    function _afterTokenTransfer(address from, address to, uint256 amount)
    internal
    override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount)
    internal
    override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
    internal
    override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
}