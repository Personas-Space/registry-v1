
require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-etherscan')
require('hardhat-contract-sizer')
require('@nomiclabs/hardhat-solhint')
require('hardhat-abi-exporter')
require('solidity-coverage')

const { DEPLOYMENT_PRIVATE_KEY, BSC_SCAN_API_KEY } = require('../.env.json')

module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    localhost: {
      live: false,
      saveDeployments: true,
      chainId: 1337,
      tags: ['local']
    },
    hardhat: {
      chainId: 1337
    },
    testnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [DEPLOYMENT_PRIVATE_KEY],
      tags: ['staging']
    },
    mainnet: {
      url: 'https://bsc-dataseed.binance.org/',
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [DEPLOYMENT_PRIVATE_KEY]
    }
  },
  solidity: {
    version: '0.8.0',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  },
  mocha: {
    timeout: 20000
  },
  etherscan: {
    apiKey: BSC_SCAN_API_KEY
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false
  },
  abiExporter: {
    path: './abi',
    clear: true,
    flat: true,
    only: [],
    spacing: 2
  }
}
