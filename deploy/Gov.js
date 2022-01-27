const { ethers, upgrades } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  // type proxy address for upgrade contract
  // deployer must have upgrade access
  const upgradeProxy = null // poly: '0x7EE76C309ed8AdCfE9681E05c7612706014274a3'

  const { save, get } = deployments
  const { deployer, devFund } = await getNamedAccounts()
  const chainId = await getChainId()

  // const TIMELOCK_ADMIN_ROLE = ethers.utils.id('TIMELOCK_ADMIN_ROLE')
  const UPGRADER_ROLE = ethers.utils.id('UPGRADER_ROLE')
  const PROPOSER_ROLE = ethers.utils.id('PROPOSER_ROLE')
  const EXECUTOR_ROLE = ethers.utils.id('EXECUTOR_ROLE')
  const MODERATOR_ROLE = ethers.utils.id('MODERATOR_ROLE')

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
  const timelock = await deployments.get('GovTimelock')

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('DevFund address:', devFund)
  console.log('ProfitToken address:', token.address)
  console.log('Timelock controller address:', timelock.address)

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    // return
    let votingDelay = 1100 // about 4 hours (block time: 13 sec)
    let votingPeriod = 6645 // about 1 day
    let proposalThreshold = ethers.utils.parseEther('100') // 100.0 tokens
    let quorum = 1 // 1%

    if (hre.network.name == 'mainnet') {
      votingDelay = 13140 // 2 days
      votingPeriod = 40320 // 6 days
      proposalThreshold = ethers.utils.parseEther('1000') // 1000.0 tokens / 0.1%
    } else if (hre.network.name == 'polygon') {
      votingDelay = 82000 // 2 days (blocktime: 2.1 sec)
      votingPeriod = 246000 // 6 days
      proposalThreshold = ethers.utils.parseEther('10000') // 10000.0 tokens / 1%
    } else if (hre.network.name == 'mumbai') {
      votingDelay = 6800 // about 4 hours (blocktime: 2.1 sec)
      votingPeriod = 41100 // about 1 day
    }

    const Gov = await ethers.getContractFactory('Gov')

    const gov = await upgrades.deployProxy(
      Gov,
      [
        token.address,
        timelock.address,
        votingDelay,
        votingPeriod,
        proposalThreshold,
        quorum,
      ],
      {
        kind: 'uups',
      }
    )

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

    const timelockContract = await ethers.getContractAt(
      'GovTimelock',
      timelock.address
    )

    let tx

    tx = await timelockContract.grantRole(PROPOSER_ROLE, gov.address)
    process.stdout.write(
      `Grant timelock PROPOSER role to governance (tx: ${tx.hash})...: `
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

    tx = await timelockContract.grantRole(EXECUTOR_ROLE, gov.address)
    process.stdout.write(
      `Grant timelock EXECUTOR role to governance (tx: ${tx.hash})...: `
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

    tx = await gov.grantRole(UPGRADER_ROLE, timelock.address)
    process.stdout.write(
      `Grant governance UPGRADER role to timelock address (tx: ${tx.hash})...: `
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

    tx = await gov.grantRole(MODERATOR_ROLE, devFund)
    process.stdout.write(
      `Grant governance MODERATOR role to development fund (tx: ${tx.hash})...: `
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
module.exports.dependencies = ['ProfitToken', 'GovTimelock']
