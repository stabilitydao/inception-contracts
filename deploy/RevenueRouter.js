const { ethers, upgrades } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  // type proxy address for upgrade contract
  // deployer must have upgrade access
  const upgradeProxy = null // poly: '0x..'

  const { save, get, deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()

  console.log('')

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    console.log(`== RevenueRouter deployment to ${hre.network.name} ==`)
    try {
      const deplpoyment = await get('RevenueRouter')
      console.log(
        `RevenueRouter already deployed to ${hre.network.name} at ${deplpoyment.address}`
      )
      return
    } catch (e) {
      // not deployed yet
    }
  } else {
    console.log(`==== RevenueRouter upgrade at ${hre.network.name} ====`)
    console.log(`Proxy address: ${upgradeProxy}`)
  }

  const token = await deployments.get('ProfitToken')

  const wethAddrs = {
    // https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    mainnet: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    // https://polygonscan.com/token/0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619
    polygon: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    // https://ropsten.etherscan.io/token/0xc778417e063141139fce010982780140aa0cd5ab
    ropsten: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
    // wrapped ether bridged from goerli
    // https://mumbai.polygonscan.com/token/0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa
    mumbai: '0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa',
  }

  let wethAddr
  if (chainId == 1337) {
    const weth = await deploy('WETH9', {
      from: deployer,
      log: true,
    })
    wethAddr = weth.address
  } else if (wethAddrs[hre.network.name]) {
    wethAddr = wethAddrs[hre.network.name]
  } else {
    throw new Error('Unsupported network')
  }

  const v3Factories = {
    polygon: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    ropsten: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    mumbai: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  }
  const v3Routers = {
    polygon: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    ropsten: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    mumbai: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  }

  let v3FactoryAddress, v3RouterAddress
  if (chainId == 1337) {
    v3FactoryAddress = (
      await deploy('UniswapV3FactoryMock', {
        from: deployer,
        log: true,
      })
    ).address
    v3RouterAddress = (
      await deploy('UniswapV3RouterMock', {
        from: deployer,
        log: true,
      })
    ).address
  } else if (v3Factories[hre.network.name]) {
    v3FactoryAddress = v3Factories[hre.network.name]
    v3RouterAddress = v3Routers[hre.network.name]
  } else {
    throw new Error('Unsupported network')
  }

  const pPayer = await deployments.get('ProfitPayer')
  const splitter = await deployments.get('Splitter')

  console.log('ChainId:', chainId)
  console.log('Deployer:', deployer)
  console.log('ProfitToken:', token.address)
  console.log('BASE (WETH):', wethAddr)
  console.log('Uniswap V3 Factory:', v3FactoryAddress)
  console.log('Uniswap V3 Router:', v3RouterAddress)
  console.log('Splitter:', splitter.address)
  console.log('ProfitPayer:', pPayer.address)

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    // return
    const RevenueRouterFactory = await ethers.getContractFactory(
      'RevenueRouter'
    )

    const RevenueRouter = await upgrades.deployProxy(
      RevenueRouterFactory,
      [
        token.address,
        wethAddr,
        10000,
        v3FactoryAddress,
        v3RouterAddress,
        splitter.address,
        pPayer.address,
      ],
      {
        kind: 'uups',
      }
    )

    await RevenueRouter.deployed()

    const artifact = await hre.artifacts.readArtifact('RevenueRouter')

    await save('RevenueRouter', {
      address: RevenueRouter.address,
      abi: artifact.abi,
    })

    let receipt = await RevenueRouter.deployTransaction.wait()
    console.log(
      `RevenueRouter proxy deployed at: ${RevenueRouter.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // hardhat verify --network r.. 0x
  }
}

module.exports.tags = ['RevenueRouter']
module.exports.dependencies = ['ProfitToken', 'Splitter', 'ProfitPayer']
