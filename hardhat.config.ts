import 'hardhat-deploy'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import 'solidity-coverage'
import 'hardhat-gas-reporter'
import '@openzeppelin/hardhat-upgrades'
import '@typechain/hardhat'
import '@nomiclabs/hardhat-web3'
require('dotenv').config()
const addressses = require('@stabilitydao/addresses/index.cjs')
const { POLYGON, ROPSTEN, RINKEBY, GOERLI, KOVAN, MUMBAI } = addressses

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
      polygon: addressses[POLYGON].devFund,
      ropsten: addressses[ROPSTEN].devFund,
      heco: addressses[ROPSTEN].devFund,
      rinkeby: addressses[RINKEBY].devFund,
      goerli: addressses[GOERLI].devFund,
      kovan: addressses[KOVAN].devFund,
      mumbai: addressses[ROPSTEN].devFund,
      hecoTestnet: addressses[ROPSTEN].devFund,
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
    polygon: {
      chainId: 137,
      url: `${process.env.URL_POLYGON}`,
      saveDeployments: true,
      accounts,
      gasPrice: 900000000000, // 900 gwei
    },
    heco: {
      chainId: 128,
      url: `${process.env.URL_HECO_MAINNET}`,
      saveDeployments: true,
      accounts,
      gasPrice: 10000000000,
    },
    ropsten: {
      url: `${process.env.URL_ROPSTEN}`,
      saveDeployments: true,
      accounts,
      gasPrice: 20000000000,
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
    mumbai: {
      chainId: 80001,
      url: `${process.env.URL_MUMBAI}`,
      saveDeployments: true,
      accounts,
      gasPrice: 10000000000,
    },
    hecoTestnet: {
      chainId: 256,
      url: `${process.env.URL_HECO_TESTNET}`,
      saveDeployments: true,
      accounts,
      gasPrice: 5000000000,
    },
    hardhat: {
      chainId: 1337, // https://hardhat.org/metamask-issue.html
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
}
