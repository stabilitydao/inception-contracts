const { ethers, upgrades } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  // type proxy address for upgrade contract
  // deployer must have upgrade access
  const upgradeProxy = null // ropsten: '0x28aCc83B9de64B892A1561576AB3b7e14E0a3c07'

  const { save, get } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()

  console.log('')

  if (hre.network.name != 'ropsten' && hre.network.name != 'hardhat') {
    return
  }

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    console.log(`== Faucet deployment to ${hre.network.name} ==`)
    try {
      const deplpoyment = await get('Faucet')
      console.log(
        `Faucet already deployed to ${hre.network.name} at ${deplpoyment.address}`
      )
      return
    } catch (e) {
      // not deployed yet
    }
  } else {
    console.log(`==== Faucet upgrade at ${hre.network.name} ====`)
    console.log(`Proxy address: ${upgradeProxy}`)
  }

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    const Faucet = await ethers.getContractFactory('Faucet')

    const faucet = await upgrades.deployProxy(Faucet, {
      kind: 'uups',
    })

    await faucet.deployed()

    const artifact = await hre.artifacts.readArtifact('Faucet')

    await save('Faucet', {
      address: faucet.address,
      abi: artifact.abi,
    })

    let receipt = await faucet.deployTransaction.wait()
    console.log(
      `Faucet proxy deployed at: ${faucet.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )
  } else {
    // try to upgrade
    const Faucet = await ethers.getContractFactory('Faucet')
    const faucet = await upgrades.upgradeProxy(upgradeProxy, Faucet)

    const artifact = await hre.artifacts.readArtifact('Faucet')

    await save('Faucetr', {
      address: faucet.address,
      abi: artifact.abi,
    })

    let receipt = await faucet.deployTransaction.wait()
    console.log(
      `Faucet upgraded through proxy: ${faucet.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // hardhat verify --network r.. 0x
  }
}

module.exports.tags = ['Faucet']
