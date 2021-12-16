const { ethers, upgrades } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  // type proxy address for upgrade contract
  // deployer must have upgrade access
  const upgradeProxy = '0x20169ebb1b60ee0c45ECAa5235551cC69Ea788C0' // ropsten: '0x20169ebb1b60ee0c45ECAa5235551cC69Ea788C0'

  const { save, get } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()

  console.log('')

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    console.log(`== DividendMinter deployment to ${hre.network.name} ==`)
    try {
      const deplpoyment = await get('DividendMinter')
      console.log(
        `DividendMinter already deployed to ${hre.network.name} at ${deplpoyment.address}`
      )
      return
    } catch (e) {
      // not deployed yet
    }

    const token = await deployments.get('ProfitToken')
    const dToken = await deployments.get('DividendToken')

    let rewardTokensPerBlock = '1000000000000000000'
    let mintingStartBlock = await ethers.provider.getBlockNumber()

    /*if (hre.network.name == 'mainnet') {
          mintingStartBlock = ...
      }*/

    console.log('ChainId:', chainId)
    console.log('Deployer address:', deployer)
    console.log('ProfitToken address:', token.address)
    console.log('DividendToken address:', dToken.address)
    console.log('New DividendTokens per block:', rewardTokensPerBlock)
    console.log('Minting start block:', mintingStartBlock)

    const DividendMinter = await ethers.getContractFactory('DividendMinter')
    const dTokenMinter = await upgrades.deployProxy(
      DividendMinter,
      [token.address, dToken.address, rewardTokensPerBlock, mintingStartBlock],
      {
        kind: 'uups',
      }
    )

    await dTokenMinter.deployed()

    const artifact = await hre.artifacts.readArtifact('DividendMinter')

    await save('DividendMinter', {
      address: dTokenMinter.address,
      abi: artifact.abi,
    })

    let receipt = await dTokenMinter.deployTransaction.wait()
    console.log(
      `DividendMinter proxy deployed at: ${dTokenMinter.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // const DEFAULT_ADMIN_ROLE = ethers.utils.id(ethers.constants.AddressZero)
    const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')

    const dTokenContract = await ethers.getContractAt(
      'DividendToken',
      dToken.address
    )

    let tx = await dTokenContract.grantRole(MINTER_ROLE, dTokenMinter.address)
    process.stdout.write(
      `Grant DividendToken MINTER_ROLE to DividendMinter (tx: ${tx.hash})...: `
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
    console.log(`==== DividendMinter upgrade at ${hre.network.name} ====`)
    console.log(`Proxy address: ${upgradeProxy}`)

    // try to upgrade
    const DividendMinter = await ethers.getContractFactory('DividendMinter')
    const minter = await upgrades.upgradeProxy(upgradeProxy, DividendMinter)

    const artifact = await hre.artifacts.readArtifact('DividendMinter')

    await save('DividendMinter', {
      address: minter.address,
      abi: artifact.abi,
    })

    let receipt = await minter.deployTransaction.wait()
    console.log(
      `EtherPayer upgraded through proxy: ${minter.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // hardhat verify --network r.. 0x
  }
}

module.exports.tags = ['DividendMinter']
module.exports.dependencies = ['ProfitToken', 'DividendToken']
