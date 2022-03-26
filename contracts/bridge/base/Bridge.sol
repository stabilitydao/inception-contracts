// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../../interfaces/IMintableBurnable.sol';

contract Bridge {
  using SafeMath for uint;
  using SafeERC20 for IERC20;

  struct TokenInfo {
    string name;
    string symbol;
    uint8 decimals;
    address tokenAddr;
    uint price;
  }
  mapping(address => TokenInfo) public tokenInfo;

  mapping(address => uint) private nonces;
  mapping(address => mapping(uint => bool)) private processedNonces;
  mapping(address => uint) private taxCollected;

  address public admin;
  uint public fee = 8;
  
  event Locked(
    address token,
    address sender,
    address recipient,
    uint amount,
    uint date,
    uint nonce,
    bool indexed lock
  );

  event TokenMinted(
    address token,
    address sender,
    address recipient,
    uint amount,
    uint date,
    uint nonce,
    bool indexed minted
  );

  event TokenBurn(
    address token,
    address sender,
    address recipient,
    uint amount,
    uint date,
    uint nonce,
    bool indexed burnt
  );

  event Unlocked(
    address token,
    address sender,
    address recipient,
    uint amount,
    uint date,
    uint nonce,
    bool indexed unlock
  );

  event NewTokenAdded(
    string name,
    address source,
    address destination
  );

  event AdminChanged(address oldAdmin, address newAdmin);

  modifier onlyAdmin() {
    require(msg.sender == admin, "bridge/not-authorized");
    _;
  }

  constructor() {
    admin = msg.sender;
  }

  function addToken(address chainA, TokenInfo memory extraArgs) external onlyAdmin {
    TokenInfo storage tknInfo = tokenInfo[chainA];
    tknInfo.name = extraArgs.name;
    tknInfo.symbol = extraArgs.symbol;
    tknInfo.decimals = extraArgs.decimals;
    tknInfo.tokenAddr = extraArgs.tokenAddr;
    tknInfo.price = extraArgs.price;
    address chainB = extraArgs.tokenAddr;
    emit NewTokenAdded(extraArgs.name, chainA, chainB);
  }

  function changeAdmin(address newAdmin) external onlyAdmin {
    require(newAdmin != address(0), "bridge/new admin cannot be zero address");
    address oldAdmin = admin;
    admin = newAdmin;
    emit AdminChanged(oldAdmin, newAdmin);
  }

  function setFee(uint value) external onlyAdmin {
    fee = value;
  }

  function withdrawTaxERC20(address token, address to) external onlyAdmin {
    TokenInfo storage tknInfo = tokenInfo[token];
    require(tknInfo.tokenAddr != address(0), "cannot withdraw");
    uint amount = taxCollected[token];
    if (amount > 0) {
      IERC20(token).safeTransfer(to, amount);
    }
  }

  function withdrawTaxETH(address to) external onlyAdmin {
    TokenInfo storage tknInfo = tokenInfo[address(0)];
    require(tknInfo.tokenAddr != address(0), "cannot withdraw");
    uint amount = taxCollected[address(0)];
    if (amount > 0) {
      (bool sent,) = payable(to).call{value: amount}("");
      require(sent, "Failed to send Ether");
    }
  }

  /**
   * @dev lock ETH to be minted on the other chain
   * @param recipient address that receives the tokens on the other chain
   */
  function lockETH(
      address recipient
  ) external payable {
    // map address(0) as ETH to synthetic ETH on the destination chain
    TokenInfo storage tknInfo = tokenInfo[address(0)];
    require(
      recipient != address(0),
      "bridge/recipient is a zero address"
    );
    require (msg.value > 0, "amount should be greater than 0");
    require(tknInfo.tokenAddr != address(0), "forbid lock");
    nonces[msg.sender] += 1;
    uint nonce = nonces[msg.sender];
    require(processedNonces[msg.sender][nonce] == false, 'transfer already processed');
    processedNonces[msg.sender][nonce] = true;
    uint initialAmount = msg.value;
    uint tknDecimals = 10 ** 18;
    uint x = tknDecimals.div(tknInfo.price);
    uint y = fee.mul(x);
    uint tax = y.div(10);
    uint finalAmount = initialAmount.sub(tax);
    taxCollected[address(0)] += tax;
    emit Locked(
      tknInfo.tokenAddr,
      msg.sender,
      recipient,
      finalAmount,
      block.timestamp,
      nonce,
      true
    );
  }

  /**
   * @dev lock tokens to be minted on the other chain
   * @param tokenIn is the token contract address on this chain
   * @param recipient address that receives the tokens on the other chain
   * @param amount amount of tokens to lock
   */
  function lockToken(
      address tokenIn,
      address recipient,
      uint amount
      ) external {
      TokenInfo storage tknInfo = tokenInfo[tokenIn];
      require(
        recipient != address(0),
        "bridge/recipient is a zero address"
      );
      require(amount > 0, "bridge/zero token locked");
      require(tknInfo.tokenAddr != address(0), "forbid lock");
      nonces[msg.sender] += 1;
      uint nonce = nonces[msg.sender];
      require(processedNonces[msg.sender][nonce] == false, 'transfer already processed');
      processedNonces[msg.sender][nonce] = true;
      uint _balanceBefore = IERC20(tokenIn).balanceOf(msg.sender);
      IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amount);
      uint _balanceAfter = IERC20(tokenIn).balanceOf(msg.sender);
      uint _actualAmount = _balanceBefore.sub(_balanceAfter);
      uint tknDecimals = 10 ** tknInfo.decimals;
      uint x = tknDecimals.div(tknInfo.price);
      uint y = fee.mul(x);
      uint tax = y.div(10);
      uint finalAmount = _actualAmount.sub(tax);
      taxCollected[tokenIn] += tax;
      emit Locked(
        tknInfo.tokenAddr,
        msg.sender,
        recipient,
        finalAmount,
        block.timestamp,
        nonce,
        true
      );
  }

  /**
   * @dev mint tokens that were locked on the other chain
   * @param tokenOut is the token contract address on this chain
   * @param sender address that locked the tokens on the other chain
   * @param recipient address that receives the tokens on this chain
   * @param amount amount of tokens to mint
   */
  function mint(
    address tokenOut,
    address sender, 
    address recipient, 
    uint amount
    ) external onlyAdmin {
    require(
      recipient != address(0),
      "bridge/recipient is a zero address"
    );
    require(amount > 0, "bridge/amount should be greater than 0");
    nonces[sender] += 1;
    uint nonce = nonces[sender];
    require(processedNonces[sender][nonce] == false, 'transfer already processed');
    processedNonces[sender][nonce] = true;
    IMintableBurnable(tokenOut).mint(recipient, amount);
    emit TokenMinted(
      tokenOut,
      sender,
      recipient,
      amount,
      block.timestamp,
      nonce,
      true
    );
  }

  /**
   * @dev burn tokens that were minted on this chain, unlocks on the other chain
   * @param tokenIn is the token contract address on this chain
   * @param recipient address that receives the tokens on the other chain
   * @param amount amount of tokens to burn
   */
  function burn(
    address tokenIn,
    address recipient,
    uint amount
    ) external {
      TokenInfo storage tknInfo = tokenInfo[tokenIn];
      require(
        recipient != address(0),
        "bridge/recipient is a zero address"
      );
      require(amount > 0, "bridge/zero token burnt");
      require(tknInfo.tokenAddr != address(0), "forbid burn");
      nonces[msg.sender] += 1;
      uint nonce = nonces[msg.sender];
      require(processedNonces[msg.sender][nonce] == false, 'transfer already processed');
      processedNonces[msg.sender][nonce] = true;
      uint _balanceBefore = IERC20(tokenIn).balanceOf(msg.sender);
      IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amount);
      uint _balanceAfter = IERC20(tokenIn).balanceOf(msg.sender);
      uint _actualAmount = _balanceBefore.sub(_balanceAfter);
      uint tknDecimals = 10 ** tknInfo.decimals;
      uint x = tknDecimals.div(tknInfo.price);
      uint y = fee.mul(x);
      uint tax = y.div(10);
      uint finalAmount = _actualAmount.sub(tax);
      taxCollected[tokenIn] += tax;
      IMintableBurnable(tokenIn).burn(address(this), finalAmount);
      emit TokenBurn(
        tknInfo.tokenAddr,
        msg.sender,
        recipient,
        finalAmount,
        block.timestamp,
        nonce,
        true
      );
  }

  /**
   * @dev unlock ETH after burning them on the other chain
   * @param sender is the account that burnt tokens on the other chain
   * @param recipient address that receives the unlocked tokens on this chain
   * @param amount amount of tokens to unlock
   */
  function unlockETH(
    address sender,
    address recipient,
    uint amount
    ) external onlyAdmin {
    require(
      recipient != address(0),
      "bridge/recipient is a zero address"
    );
    require(amount > 0, "bridge/amount should be greater than 0");
    nonces[sender] += 1;
    uint nonce = nonces[sender];
    require(processedNonces[sender][nonce] == false, 'transfer already processed');
    processedNonces[sender][nonce] = true;
    (bool sent,) = payable(recipient).call{value: amount}("");
    require(sent, "Failed to send Ether");
    emit Unlocked(
      address(0),
      sender,
      recipient,
      amount,
      block.timestamp,
      nonce,
      true
    );
  }

  /**
   * @dev unlock tokens after burning them on the other chain
   * @param tokenOut is the token contract address on this chain
   * @param sender is the account that burnt tokens on the other chain
   * @param recipient address that receives the unlocked tokens on this chain
   * @param amount amount of tokens to unlock
   */
  function unlockToken(
    address tokenOut,
    address sender,
    address recipient,
    uint amount
    ) external onlyAdmin {
    require(
      recipient != address(0),
      "bridge/recipient is a zero address"
    );
    require(amount > 0, "bridge/amount should be greater than 0");
    nonces[sender] += 1;
    uint nonce = nonces[sender];
    require(processedNonces[sender][nonce] == false, 'transfer already processed');
    processedNonces[sender][nonce] = true;
    IERC20(tokenOut).safeTransfer(recipient, amount);
    emit Unlocked(
      tokenOut,
      sender,
      recipient,
      amount,
      block.timestamp,
      nonce,
      true
    );
  }

}
