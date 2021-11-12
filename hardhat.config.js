require('@nomiclabs/hardhat-waffle')
require('hardhat-deploy')
require('hardhat-gas-reporter')
require('solidity-coverage')
require('dotenv').config()

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
      mainnet: '0xEb49018157bAF7F1B385657D10fF5a5a5F4BB4c9',
      ropsten: '0x90AfD7eEE756c85Aa9800d33Fda674618ddECFbf',
      rinkeby: '0x62706332c976f92bBd5F099fB8D4717951eC00a4',
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
    hardhat: {
      chainId: 1337, // https://hardhat.org/metamask-issue.html
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
}
