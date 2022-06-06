const { ethers, upgrades } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  // type proxy address for upgrade contract
  // deployer must have upgrade access
  const upgradeProxy = '0xa3B6Ad2A14Cfc87D370328C038E2496215eC6E9F' //null

  const { save, get } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()

  console.log('')

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    console.log(`== MetaRouter deployment to ${hre.network.name} ==`)
    try {
      const deplpoyment = await get('MetaRouter')
      console.log(
        `MetaRouter already deployed to ${hre.network.name} at ${deplpoyment.address}`
      )
      return
    } catch (e) {
      // not deployed yet
    }
  } else {
    console.log(`==== MetaRouter upgrade at ${hre.network.name} ====`)
    console.log(`Proxy address: ${upgradeProxy}`)
  }

  const revenueRouter = await deployments.get('RevenueRouter')

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    const MetaRouterFactory = await ethers.getContractFactory('MetaRouter')

    const MetaRouter = await upgrades.deployProxy(
      MetaRouterFactory,
      [revenueRouter.address, 50],
      {
        kind: 'uups',
      }
    )

    await MetaRouter.deployed()

    const artifact = await hre.artifacts.readArtifact('MetaRouter')

    await save('MetaRouter', {
      address: MetaRouter.address,
      abi: artifact.abi,
    })

    let receipt = await MetaRouter.deployTransaction.wait()
    console.log(
      `MetaRouter proxy deployed at: ${MetaRouter.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )
  } else {
    // try to upgrade
    const MetaRouterFactory = await ethers.getContractFactory('MetaRouter')
    const MetaRouter = await upgrades.upgradeProxy(
      upgradeProxy,
      MetaRouterFactory
    )

    const artifact = await hre.artifacts.readArtifact('MetaRouter')

    await save('MetaRouter', {
      address: MetaRouter.address,
      abi: artifact.abi,
    })

    let receipt = await MetaRouter.deployTransaction.wait()
    console.log(
      `MetaRouter upgraded through proxy: ${MetaRouter.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // hardhat verify --network r.. 0x
  }
}

module.exports.tags = ['MetaRouter']
module.exports.dependencies = ['RevenueRouter']
