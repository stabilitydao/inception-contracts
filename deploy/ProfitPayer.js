const { ethers, upgrades } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  // type proxy address for upgrade contract
  // deployer must have upgrade access
  const upgradeProxy = null //

  const { save, get } = deployments
  const { deployer, devFund } = await getNamedAccounts()
  const chainId = await getChainId()

  console.log('')

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    console.log(`== ProfitPayer deployment to ${hre.network.name} ==`)
    try {
      const deplpoyment = await get('ProfitPayer')
      console.log(
        `ProfitPayer already deployed to ${hre.network.name} at ${deplpoyment.address}`
      )
      return
    } catch (e) {
      // not deployed yet
    }
  } else {
    console.log(`==== ProfitPayer upgrade at ${hre.network.name} ====`)
    console.log(`Proxy address: ${upgradeProxy}`)
  }

  const dToken = await deployments.get('DividendToken')
  const profitToken = await deployments.get('ProfitToken')

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('Development Fund address:', devFund)
  console.log('ProfitToken address:', profitToken.address)
  console.log('DividendToken address:', dToken.address)

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    const ProfitPayerFactory = await ethers.getContractFactory('ProfitPayer')

    const profitPayer = await upgrades.deployProxy(
      ProfitPayerFactory,
      [dToken.address, profitToken.address],
      {
        kind: 'uups',
      }
    )

    await profitPayer.deployed()

    const artifact = await hre.artifacts.readArtifact('ProfitPayer')

    await save('ProfitPayer', {
      address: profitPayer.address,
      abi: artifact.abi,
    })

    let receipt = await profitPayer.deployTransaction.wait()
    console.log(
      `ProfitPayer proxy deployed at: ${profitPayer.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // grant snapshot role to payer from dtoken
    const SNAPSHOT_ROLE = ethers.utils.id('SNAPSHOT_ROLE')

    const dTokenContract = await ethers.getContractAt(
      'DividendToken',
      dToken.address
    )

    let tx = await dTokenContract.grantRole(SNAPSHOT_ROLE, profitPayer.address)
    process.stdout.write(
      `Grant DividendToken SNAPSHOT_ROLE to ProfitPayer (tx: ${tx.hash})...: `
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
    const ProfitPayerFactory = await ethers.getContractFactory('ProfitPayer')
    const profitPayer = await upgrades.upgradeProxy(
      upgradeProxy,
      ProfitPayerFactory
    )

    const artifact = await hre.artifacts.readArtifact('ProfitPayer')

    await save('ProfitPayer', {
      address: profitPayer.address,
      abi: artifact.abi,
    })

    let receipt = await profitPayer.deployTransaction.wait()
    console.log(
      `ProfitPayer upgraded through proxy: ${profitPayer.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // hardhat verify --network r.. 0x
  }
}

module.exports.tags = ['ProfitPayer']
module.exports.dependencies = ['DividendToken', 'ProfitToken']
