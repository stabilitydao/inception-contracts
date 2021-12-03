const { ethers, upgrades } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  console.log('')
  console.log('== DividendTokenMinter deployment to', hre.network.name, '==')

  const { save, get } = deployments
  const { deployer, devFund } = await getNamedAccounts()
  const chainId = await getChainId()
  const token = await deployments.get('ProfitToken')
  const dToken = await deployments.get('DividendToken')

  let rewardTokensPerBlock = 1
  let mintingStartBlock = await ethers.provider.getBlockNumber()

  /*if (hre.network.name == 'mainnet') {
        mintingStartBlock = ...
    }*/

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('Development Fund address:', devFund)
  console.log('ProfitToken address:', token.address)
  console.log('DividendToken address:', dToken.address)
  console.log('New DividendTokens per block:', rewardTokensPerBlock)
  console.log('Minting start block:', mintingStartBlock)

  try {
    const deplpoyment = await get('DividendTokenMinter');
    console.log(`DividendTokenMinter already deployed to ${hre.network.name} at ${deplpoyment.address}`)
    return;
  } catch (e) {
    // not deployed yet
  }

  const DividendTokenMinter = await ethers.getContractFactory(
    'DividendTokenMinter'
  )
  const dTokenMinter = await upgrades.deployProxy(
    DividendTokenMinter,
    [
      token.address,
      dToken.address,
      rewardTokensPerBlock,
      mintingStartBlock,
      devFund,
    ],
    {
      kind: 'uups',
    }
  )

  await dTokenMinter.deployed()

  const artifact = await hre.artifacts.readArtifact('DividendTokenMinter')

  await save('DividendTokenMinter', {
    address: dTokenMinter.address,
    abi: artifact.abi,
  })

  let receipt = await dTokenMinter.deployTransaction.wait()
  console.log(
    `DividendTokenMinter proxy deployed at: ${dTokenMinter.address} (block: ${
      receipt.blockNumber
    }) with ${receipt.gasUsed.toNumber()} gas`
  )

  const DEFAULT_ADMIN_ROLE = ethers.utils.id(ethers.constants.AddressZero)
  const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')

  const dTokenContract = await ethers.getContractAt(
    'DividendToken',
    dToken.address
  )

  let tx = await dTokenContract.grantRole(MINTER_ROLE, dTokenMinter.address)
  process.stdout.write(
    `Grant DividendToken MINTER_ROLE to DividendTokenMinter (tx: ${tx.hash})...: `
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

  tx = await dTokenContract.renounceRole(DEFAULT_ADMIN_ROLE, deployer)
  process.stdout.write(
    `Renounce DividendToken DEFAULT_ADMIN_ROLE from deployer (tx: ${tx.hash})...: `
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

  const poolContract = await ethers.getContractAt(
    'DividendTokenMinter',
    dTokenMinter.address
  )

  tx = await poolContract.renounceRole(DEFAULT_ADMIN_ROLE, deployer)
  process.stdout.write(
    `Renounce DividendTokenMinter DEFAULT_ADMIN_ROLE from deployer (tx: ${tx.hash})...: `
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
}

module.exports.tags = ['DividendTokenMinter']
module.exports.dependencies = ['ProfitToken', 'DividendToken']
