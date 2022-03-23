const { ethers, upgrades } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  // type proxy address for upgrade contract
  // deployer must have upgrade access
  // mumbai 0x50B867305F71eBCbbbDD2C9D249d611691B8E458
  const upgradeProxy = null // poly: '0x..'

  const { save, get } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()

  console.log('')

  let contractName = 'ProfitMaker'
  if (chainId == 3 || chainId == 80001) {
    contractName = 'ProfitMakerTestnet'
  } else {
    return
  }

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    console.log(`== ${contractName} deployment to ${hre.network.name} ==`)
    try {
      const deplpoyment = await get(contractName)
      console.log(
        `${contractName} already deployed to ${hre.network.name} at ${deplpoyment.address}`
      )
      return
    } catch (e) {
      // not deployed yet
    }
  } else {
    console.log(`==== ${contractName} upgrade at ${hre.network.name} ====`)
    console.log(`Proxy address: ${upgradeProxy}`)
  }

  const token = await deployments.get('ProfitToken')

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('ProfitToken address:', token.address)

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    // return
    const ProfitMakerFactory = await ethers.getContractFactory(contractName)

    const profitmaker = await upgrades.deployProxy(
      ProfitMakerFactory,
      [token.address],
      {
        kind: 'uups',
      }
    )

    await profitmaker.deployed()

    const artifact = await hre.artifacts.readArtifact(contractName)

    await save(contractName, {
      address: profitmaker.address,
      abi: artifact.abi,
    })

    let receipt = await profitmaker.deployTransaction.wait()
    console.log(
      `${contractName} proxy deployed at: ${profitmaker.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // hardhat verify --network r.. 0x
  } else {
    // try to upgrade
    const ProfitMakerFactory = await ethers.getContractFactory(contractName)
    const profitmaker = await upgrades.upgradeProxy(
      upgradeProxy,
      ProfitMakerFactory
    )

    const artifact = await hre.artifacts.readArtifact(contractName)

    await save(contractName, {
      address: profitmaker.address,
      abi: artifact.abi,
    })

    let receipt = await profitmaker.deployTransaction.wait()
    console.log(
      `${contractName} upgraded through proxy: ${profitmaker.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // hardhat verify --network r.. 0x
  }
}

module.exports.tags = ['ProfitMaker']
module.exports.dependencies = ['ProfitToken']
