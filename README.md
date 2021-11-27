<div align="center">
<a href="https://stabilitydao.org"><img alt="Stability" src="https://stabilitydao.org/logo.png" width=420></a>  
<h1>Stability Core</h1>
</div>
<p align="center">
  <a href="https://github.com/stabilitydao/core/actions/workflows/tests.yml?query=branch%3Amain"><img src="https://github.com/stabilitydao/core/actions/workflows/tests.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/stabilitydao/core/actions/workflows/lint.yml?query=branch%3Amain"><img src="https://github.com/stabilitydao/core/actions/workflows/lint.yml/badge.svg?branch=main" /></a>
  <a href="https://app.codecov.io/gh/stabilitydao/core"><img src="https://codecov.io/gh/stabilitydao/core/branch/main/graph/badge.svg?token=EO6E2Z0Y5Z" /></a>
<a href="https://github.com/stabilitydao/core/blob/main/LICENSE"><img src="https://img.shields.io/github/license/stabilitydao/core?style=flat" /></a>
</p>
<p align="center">
<b>Source code of smart contracts for Stability protocol</b> 
</p>

## What is Stability?

Stability is a profit generating protocol managed and developed by our decentralized autonomous organization.

## Platform repositories

- **stabilitydao/core** - smart contracts
- [stabilitydao/app](https://github.com/stabilitydao/app) - frontend application
- [stabilitydao/addresses](https://github.com/stabilitydao/addresses) - deployment addresses

## Core Development

### Branches

| Branch                                                        | What for?                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [main](https://github.com/stabilitydao/core/tree/main/)       | Mainnet deployed smart contracts. Production.                                                    |
| [develop](https://github.com/stabilitydao/core/tree/develop/) | Testnet deployments. Contracts for testing, debugging, and auditing before deploying to mainnet. |
| l2/\*\*                                                       | Layer 2 specific network contracts development and deployments.                                  |
| draft/\*\*                                                    | Protocol development.                                                                            |

### Technology stack

- ![GitHub Repo stars](https://img.shields.io/github/stars/ethereum/go-ethereum?style=plastic) **[Ethereum](https://ethereum.org/en/)** [ethereum/go-ethereum](https://github.com/ethereum/go-ethereum)
- ![GitHub Repo stars](https://img.shields.io/github/stars/ethereum/solidity?style=plastic) **[Solidity](https://soliditylang.org/)** [ethereum/solidity](https://github.com/ethereum/solidity)
- ![GitHub Repo stars](https://img.shields.io/github/stars/OpenZeppelin/openzeppelin-contracts?style=plastic) **[OpenZeppelin](https://openzeppelin.com)** [OpenZeppelin/openzeppelin-contracts](https://github.com/OpenZeppelin/openzeppelin-contracts)
- ![GitHub Repo stars](https://img.shields.io/github/stars/ethers-io/ethers.js?style=plastic) **[Ethers](https://ethers.org/)** [ethers-io/ethers.js](https://github.com/ethers-io/ethers.js/)
- ![GitHub Repo stars](https://img.shields.io/github/stars/nomiclabs/hardhat?style=plastic) **[Hardhat](https://hardhat.org/)** [nomiclabs/hardhat](https://github.com/nomiclabs/hardhat)
- ![GitHub Repo stars](https://img.shields.io/github/stars/EthWorks/Waffle?style=plastic) **[Waffle](https://getwaffle.io/)** [EthWorks/Waffle](https://github.com/EthWorks/Waffle)

### Learning smart contract development

- https://ethereum.org/en/developers/docs/
- https://docs.soliditylang.org/
- https://docs.openzeppelin.com/contracts/4.x/
- https://hardhat.org/getting-started/

### Start coding

#### Setup

```
git clone https://github.com/stabilitydao/core.git
cd core
yarn
```

#### Local environment

```
npx hardhat node
```

#### Testing

```
yarn test
```

#### Linting

```
yarn lint
```

#### Coverage

```
yarn coverage
```

### Cleaning

```
yarn clean
```
