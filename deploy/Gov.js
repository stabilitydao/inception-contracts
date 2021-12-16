const { ethers, upgrades } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  // type proxy address for upgrade contract
  // deployer must have upgrade access
  const upgradeProxy = null // ropsten: ''

  const { save, get } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()

  console.log('')

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    console.log(`== Gov deployment to ${hre.network.name} ==`)
    try {
      const deplpoyment = await get('Gov')
      console.log(
        `Gov already deployed to ${hre.network.name} at ${deplpoyment.address}`
      )
      return
    } catch (e) {
      // not deployed yet
    }
  } else {
    console.log(`==== Gov upgrade at ${hre.network.name} ====`)
    console.log(`Proxy address: ${upgradeProxy}`)
  }

  const token = await deployments.get('ProfitToken')

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('ProfitToken address:', token.address)

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    const Gov = await ethers.getContractFactory('Gov')

    const gov = await upgrades.deployProxy(Gov, [token.address], {
      kind: 'uups',
    })

    await gov.deployed()

    const artifact = await hre.artifacts.readArtifact('Gov')

    await save('Gov', {
      address: gov.address,
      abi: artifact.abi,
    })

    let receipt = await gov.deployTransaction.wait()
    console.log(
      `Gov proxy deployed at: ${gov.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )
  } else {
    // try to upgrade
    const Gov = await ethers.getContractFactory('Gov')
    const gov = await upgrades.upgradeProxy(upgradeProxy, Gov)

    const artifact = await hre.artifacts.readArtifact('Gov')

    await save('Gov', {
      address: gov.address,
      abi: artifact.abi,
    })

    let receipt = await gov.deployTransaction.wait()
    console.log(
      `Gov upgraded through proxy: ${gov.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // hardhat verify --network r.. 0x
  }
}

module.exports.tags = ['Gov']
module.exports.dependencies = ['ProfitToken']
