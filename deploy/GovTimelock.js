module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  console.log('')
  console.log('== Timelock controller deployment ==')

  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()

  let minDelay = 100
  if (hre.network.name == 'mainnet') {
    minDelay = 1000
  }

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('Timelock minDelay:', minDelay)

  await deploy('GovTimelock', {
    from: deployer,
    log: true,
    args: [minDelay, [], [ethers.constants.AddressZero]],
  })
}

module.exports.tags = ['GovTimelock']
