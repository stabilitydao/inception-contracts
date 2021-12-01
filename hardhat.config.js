require('@nomiclabs/hardhat-waffle')
require('hardhat-deploy')
require('hardhat-gas-reporter')
require('solidity-coverage')
require('dotenv').config()
require('@openzeppelin/hardhat-upgrades')
const addressses = require('@stabilitydao/addresses/index.cjs')
const { MAINNET, ROPSTEN, RINKEBY, GOERLI, KOVAN } = addressses

const accounts = {
  mnemonic:
    process.env.MNEMONIC ||
    'syrup test test test test test test test test test test test',
}

module.exports = {
  solidity: {
    version: '0.8.9',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  gasReporter: {
    currency: 'USD',
    enabled: process.env.REPORT_GAS === 'true',
    gasPrice: 120,
    gasMultiplier: 2,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    devFund: {
      hardhat: 1,
      mainnet: addressses[MAINNET].devFund,
      ropsten: addressses[ROPSTEN].devFund,
      rinkeby: addressses[RINKEBY].devFund,
      goerli: addressses[GOERLI].devFund,
      kovan: addressses[KOVAN].devFund,
    },
    tester: {
      default: 2,
    },
  },
  networks: {
    mainnet: {
      url: `${process.env.URL_MAINNET}`,
      saveDeployments: true,
      accounts,
      gasPrice: 113000000000,
    },
    ropsten: {
      url: `${process.env.URL_ROPSTEN}`,
      saveDeployments: true,
      accounts,
    },
    rinkeby: {
      url: `${process.env.URL_RINKEBY}`,
      saveDeployments: true,
      accounts,
    },
    goerli: {
      url: `${process.env.URL_GOERLI}`,
      saveDeployments: true,
      accounts,
    },
    kovan: {
      url: `${process.env.URL_KOVAN}`,
      saveDeployments: true,
      accounts,
    },
    hardhat: {
      chainId: 1337, // https://hardhat.org/metamask-issue.html
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
}
