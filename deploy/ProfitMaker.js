const { ethers, upgrades } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  // type proxy address for upgrade contract
  // deployer must have upgrade access
  const upgradeProxy = null // poly: '0x..'

  const { save, get } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()

  console.log('')

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    console.log(`== ProfitMaker deployment to ${hre.network.name} ==`)
    try {
      const deplpoyment = await get('ProfitMaker')
      console.log(
        `ProfitMaker already deployed to ${hre.network.name} at ${deplpoyment.address}`
      )
      return
    } catch (e) {
      // not deployed yet
    }
  } else {
    console.log(`==== ProfitMaker upgrade at ${hre.network.name} ====`)
    console.log(`Proxy address: ${upgradeProxy}`)
  }

  const token = await deployments.get('ProfitToken')

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('ProfitToken address:', token.address)

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    // return
    const ProfitMakerFactory = await ethers.getContractFactory('ProfitMaker')

    const profitmaker = await upgrades.deployProxy(
      ProfitMakerFactory,
      [token.address],
      {
        kind: 'uups',
      }
    )

    await profitmaker.deployed()

    const artifact = await hre.artifacts.readArtifact('ProfitMaker')

    await save('ProfitMaker', {
      address: profitmaker.address,
      abi: artifact.abi,
    })

    let receipt = await profitmaker.deployTransaction.wait()
    console.log(
      `ProfitMaker proxy deployed at: ${profitmaker.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // hardhat verify --network r.. 0x
  }
}

module.exports.tags = ['ProfitMaker']
module.exports.dependencies = ['ProfitToken']
