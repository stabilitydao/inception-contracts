// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../token/DividendToken.sol";
import "../interfaces/IPayer.sol";

/**
 * @title DividendPayer
 * @dev This contract allows to split ERC20 payments amoung DividendToken
 * holders.
 * The split is done proportional to the percentage holdings of DividendToken.
 * Holding shares extraction is done through {ERC20Snapshot} mechanism.
 * DividendPayer follows a _pull payment_ model. This means that
 * payments are not automatically forwarded to the accounts but kept in this
 * contract, and the actual transfer is triggered as a separate step by calling
 * the {releasePayment} function.
 *
 * Inspired by OpenZeppelin PaymentSplitter and SharjeelSafdar ERC20PaymentSplitter
 */
abstract contract DividendPayer is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable, OwnableUpgradeable, IPayer {
    struct Received {
        uint256 snapshotId;
        uint256 amount;
        address from;
    }
    struct Payment {
        uint256 snapshotId;
        uint256 amount;
        address to;
    }

    Received[] private _received;
    mapping(address => uint256) private _totalReceivedFrom;
    uint256 private _totalReceived;

    mapping(address => Payment[]) private _payments;
    mapping(address => uint256) private _totalPaidTo;

    uint256 private _totalPaid;

    DividendToken public _sharesToken;
    ERC20Upgradeable public _paymentToken;

    /**
     * @dev Emitted when a payment is received.
     * @param from Address from which payment is received.
     * @param amount Amount of `_paymentToken` received.
     */
    event PaymentReceived(address from, uint256 amount);

    /**
     * @dev Emitted when a payment is released.
     * @param to Address to which payment is released.
     * @param amount Amount of `_paymentToken` released.
     */
    event PaymentReleased(address to, uint256 amount);

    /**
     * @dev Set the values for {_sharesToken} and {_paymentToken}.
     * @param sharesToken_ Address of the DividendToken to use.
     * @param paymentToken_ Address of the {ERC20} token to use.
     */
    function __DividendPayer_init(
        // solhint-disable-previous-line func-name-mixedcase
        DividendToken sharesToken_,
        ERC20Upgradeable paymentToken_
    ) internal initializer {
        _sharesToken = sharesToken_;
        _paymentToken = paymentToken_;
        __UUPSUpgradeable_init();
        __Ownable_init();
    }

    /**
     * @dev Get the total amount of `_paymentToken` released so far.
     */
    function totalPaid() public view returns (uint256) {
        return _totalPaid;
    }

    /**
     * @dev Get the total amount of `_paymentToken` released to `payee` so far.
     * @param payee Address for which total paid amount is desired.
     */
    function totalPaidTo(address payee) public view returns (uint256) {
        return _totalPaidTo[payee];
    }

    /**
     * @dev Get the total number of payments released to `payee` so far.
     */
    function releasedPaymentsCount(address payee) public view returns (uint256) {
        return _payments[payee].length;
    }

    /**
     * @dev Get the `pos`-th released payment to `payee`.
     * @param payee Address for which payment data is desired.
     * @param pos Index of the released payment.
     *
     * Requirements:
     *
     * - `pos` must be a valid index.
     */
    function releasedPaymentsData(address payee, uint256 pos) public view returns (Payment memory) {
        require(pos < releasedPaymentsCount(payee), "Payer: out of bounds index.");
        return _payments[payee][pos];
    }

    /**
     * @dev Get the total amount of `_paymentToken` received so far.
     */
    function totalReceived() public view returns (uint256) {
        return _totalReceived;
    }

    /**
     * @dev Get the total amount of `_paymentToken` received from `payer` so far.
     * @param payer Address for which total received amount is desired.
     */
    function totalReceivedFrom(address payer) public view returns (uint256) {
        return _totalReceivedFrom[payer];
    }

    /**
     * @dev Returns the number of payments received so far.
     */
    function receivedPaymentsCount() public view returns (uint256) {
        return _received.length;
    }

    /**
     * @dev Get the `pos`-th received payment.
     * @param pos Index of the received payment.
     *
     * Requirements:
     *
     * - `pos` must be a valid index.
     */
    function receivedPaymentsData(uint256 pos) public view returns (Received memory) {
        require(pos < receivedPaymentsCount(), "Payer: out of bounds index.");
        return _received[pos];
    }

    /**
     * @dev Get the pending payment for `payee`.
     * @param payee Address for which pending payment is desired.
     */
    function paymentPending(address payee) public view returns(uint256 currentPayment) {
        Payment[] storage payments = _payments[payee];
        uint256 lastPaymentSnapshot = payments.length == 0 ? 0 : payments[payments.length - 1].snapshotId;

        for (uint256 i = _received.length; i > 0; --i) {
            uint256 receiveSnapshot = _received[i - 1].snapshotId;
            if (lastPaymentSnapshot > receiveSnapshot) {
                break;
            }
            uint256 sharesInReceiveSnapshot = _sharesToken.balanceOfAt(payee, receiveSnapshot);
            uint256 totalSharesInReceiveSnapshot = _sharesToken.totalSupplyAt(receiveSnapshot);
            currentPayment += (_received[i - 1].amount * sharesInReceiveSnapshot) / totalSharesInReceiveSnapshot;
        }
    }

    /**
     * @dev Receives `_paymentToken` from `sender`.
     * @param sender Address of the sender.
     * @param amount Amount of tokens to receive.
     *
     * Emits a {PaymentReceived} event.
     * Emits a {Snapshot} event on {ERC20Shares} contract.
     *
     * Requirements:
     *
     * - Total shares must be non-zero at the time of receiving payment. Else,
     *   payment will get locked in this contract forever with no one to claim
     *   it.
     * - `amount` must be non-zero.
     * - Sender must have already allowed {ERC20PaymentSplitter} to draw
     *   `amount` tokens from `sender` address.
     * - This contract must have {SNAPSHOT_CREATOR} role in {ERC20Shares}.
     */
    function receivePayment(address sender, uint256 amount) external {
        require(_sharesToken.totalSupply() > 0, "Payer: no share holder");
        require(amount > 0, "Payer: receiving zero tokens.");
        _paymentToken.transferFrom(sender, address(this), amount);
        emit PaymentReceived(sender, amount);

        _totalReceived += amount;
        _totalReceivedFrom[sender] += amount;
        uint256 nextSnapshotId = _sharesToken.snapshot();
        _received.push(Received({
        snapshotId: nextSnapshotId,
        amount: amount,
        from: sender
        }));
    }

    /**
     * @dev Releases payment (if any) to the sender of the call.
     *
     * Emits a {PaymentReleased} event.
     * Emits a {Snapshot} event on {ERC20Shares} contract.
     *
     * Requirements:
     *
     * - Sender must have non-zero pending payment.
     * - This contract must have {SNAPSHOT_CREATOR} role in {ERC20Shares}.
     */
    function releasePayment() public virtual nonReentrant {
        address payee = _msgSender();
        uint256 payment = paymentPending(payee);
        require(payment > 0, "Account is not due any payment");

        emit PaymentReleased(payee, payment);

        _totalPaid += payment;
        _totalPaidTo[payee] += payment;
         uint256 nextSnapshotId = _sharesToken.snapshot();
        _payments[payee].push(Payment({
        snapshotId: nextSnapshotId,
        amount: payment,
        to: payee
        }));
        _paymentToken.transfer(payee, payment);
    }

    function _authorizeUpgrade(address newImplementation) internal onlyOwner override {
        // solhint-disable-previous-line no-empty-blocks
    }
}