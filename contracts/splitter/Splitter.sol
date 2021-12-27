// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

abstract contract Splitter is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    // Splitting asset token
    // IERC20Upgradeable public token; -- Do we need ??

    uint8 public div;
    uint8 public gov;
    uint8 public dev;

    address payable public payer;
    address payable public treasure;
    address payable public devFund;

    function __Splitter_init(
        // IERC20Upgradeable _token, -- Do we need ??
        uint8 _div,
        uint8 _gov,
        uint8 _dev,
        address payable _payer,
        address payable _treasure,
        address payable _devFund
    ) internal initializer {
        div = _div;
        gov = _gov;
        dev = _dev;
        payer = _payer;
        treasure = _treasure;
        devFund = _devFund;
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function change(
        uint8 _div,
        uint8 _gov,
        uint8 _dev
    ) public onlyOwner {
        require(_div >= 10);
        require(_div <= 90);
        require(_gov >= 10);
        require(_gov <= 90);
        require(_dev >= 2);
        require(_dev <= 50);
        require(_div + _gov + _dev == 100);

        div = _div;
        gov = _gov;
        dev = _dev;
    }

    // Fallback Function to Call splitPayment() whenever ETH is sent to this contract
    receive() external payable {
        splitPayment();
    }

    function splitPayment() public payable onlyOwner {
        // Record the amount of ETH that was sent to this splitter contract.
        uint256 amtReceived = msg.value;

        uint256 onePercent = amtReceived/100;

        // Percentage to send to Dividend Payer contract
        uint256 pDiv = div * onePercent;

        // Percentage to send to Governance/Treasury contract
        uint256 pGov = gov * onePercent;

        // Percentage to send to devFund Multisig Wallet
        uint256 pDevFund = dev * onePercent;

        // distribute contract token balance to dividend payer contract, goveranance and devFund

        // approve token on contract balance -- we dont need to approve

        // call Payer contract method receivePayment() with payer share
        payer.transfer(pDiv); // I think I'm Done here, You just need to update the code of the DividendPayer.sol, and add a fallback Function
        // send gov share to treasure address
        treasure.transfer(pGov);
        // send dev share to devFund address
        devFund.transfer(pDevFund);
    }
}