// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";


contract Faucet is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    mapping(address => uint256) public list;

    uint256 public amount;

    event Sent(address indexed to, uint256 amount);
    event Changed(uint256 newAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
    }

    function initialize() public initializer {
        amount = 1 ether;
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    receive() external payable {
        // solhint-disable-previous-line no-empty-blocks
    }

    function giveEther() public {
        require(block.number > list[msg.sender], "You have taken recently");
        require(address(this).balance > amount, "Ether is over..");
        address payable pay = payable(msg.sender);
        list[msg.sender] = block.number + 6500; //Once in about day
        pay.transfer(amount);
        emit Sent(msg.sender, amount);
    }

    function changeAmount(uint256 newAmount) public onlyOwner {
        amount = newAmount;
        emit Changed(amount);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyOwner
    override
    {
        // solhint-disable-previous-line no-empty-blocks
    }
}
