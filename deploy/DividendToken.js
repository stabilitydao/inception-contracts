const { ethers, upgrades } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  console.log('')
  console.log('== DividendToken deployment to', hre.network.name, '==')

  const { save, get } = deployments
  const { deployer, devFund } = await getNamedAccounts()
  const chainId = await getChainId()

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('Development Fund address:', devFund)

  try {
    const deplpoyment = await get('DividendToken');
    console.log(`DividendToken already deployed to ${hre.network.name} at ${deplpoyment.address}`)
    return;
  } catch (e) {
    // not deployed yet
  }

  // https://docs.openzeppelin.com/upgrades-plugins/1.x/hardhat-upgrades
  // https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786
  // https://www.youtube.com/watch?v=kWUDTZhxKZI
  // https://forum.openzeppelin.com/t/integrating-hardhat-deploy-and-openzeppelin-hardhat-upgrades/5585/2
  const DividendToken = await ethers.getContractFactory('DividendToken')
  const dToken = await upgrades.deployProxy(DividendToken, [devFund], {
    kind: 'uups',
  })

  await dToken.deployed()

  const artifact = await hre.artifacts.readArtifact('DividendToken')

  await save('DividendToken', {
    address: dToken.address,
    abi: artifact.abi,
  })

  let receipt = await dToken.deployTransaction.wait()
  console.log(
    `DividendToken proxy deployed at: ${dToken.address} (block: ${
      receipt.blockNumber
    }) with ${receipt.gasUsed.toNumber()} gas`
  )
}

module.exports.tags = ['DividendToken']
