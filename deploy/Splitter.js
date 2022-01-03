const { ethers, upgrades } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  // type proxy address for upgrade contract
  // deployer must have upgrade access
  const upgradeProxy = null // poly: ''

  const { save, get } = deployments
  const { deployer, devFund } = await getNamedAccounts()
  const chainId = await getChainId()

  const CHANGER_ROLE = ethers.utils.id('CHANGER_ROLE')
  const EXECUTOR_ROLE = ethers.utils.id('EXECUTOR_ROLE')

  let tx

  console.log('')

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    console.log(`== Splitter deployment to ${hre.network.name} ==`)
    try {
      const deplpoyment = await get('Splitter')
      console.log(
        `Splitter already deployed to ${hre.network.name} at ${deplpoyment.address}`
      )
      return
    } catch (e) {
      // not deployed yet
    }
  } else {
    console.log(`==== Splitter upgrade at ${hre.network.name} ====`)
    console.log(`Proxy address: ${upgradeProxy}`)
  }

  const timelock = await deployments.get('GovTimelock')

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('DevFund address:', devFund)
  console.log('Timelock controller address:', timelock.address)

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    const SplitterFactory = await ethers.getContractFactory('Splitter')

    const splitter = await upgrades.deployProxy(
      SplitterFactory,
      [40, 30, 30, timelock.address, devFund],
      {
        kind: 'uups',
      }
    )

    await splitter.deployed()

    const artifact = await hre.artifacts.readArtifact('Splitter')

    await save('Splitter', {
      address: splitter.address,
      abi: artifact.abi,
    })

    let receipt = await splitter.deployTransaction.wait()
    console.log(
      `Splitter proxy deployed at: ${splitter.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    tx = await splitter.grantRole(CHANGER_ROLE, timelock.address)
    process.stdout.write(
      `Grant splitter CHANGER_ROLE role to governance timelock (tx: ${tx.hash})...: `
    )

    receipt = await tx.wait()
    if (receipt.status) {
      console.log(
        `done (block: ${
          receipt.blockNumber
        }) with ${receipt.gasUsed.toNumber()} gas`
      )
    } else {
      console.log(`REVERTED!`)
    }

    tx = await splitter.grantRole(EXECUTOR_ROLE, devFund)
    process.stdout.write(
      `Grant splitter EXECUTOR_ROLE role to devFund (tx: ${tx.hash})...: `
    )

    receipt = await tx.wait()
    if (receipt.status) {
      console.log(
        `done (block: ${
          receipt.blockNumber
        }) with ${receipt.gasUsed.toNumber()} gas`
      )
    } else {
      console.log(`REVERTED!`)
    }
  } else {
    // try to upgrade
    const SplitterFactory = await ethers.getContractFactory('Splitter')
    const splitter = await upgrades.upgradeProxy(upgradeProxy, SplitterFactory)

    const artifact = await hre.artifacts.readArtifact('Splitter')

    await save('Splitter', {
      address: splitter.address,
      abi: artifact.abi,
    })

    let receipt = await splitter.deployTransaction.wait()
    console.log(
      `Splitter upgraded through proxy: ${splitter.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // hardhat verify --network r.. 0x
  }
}

module.exports.tags = ['Splitter']
module.exports.dependencies = ['GovTimelock']
