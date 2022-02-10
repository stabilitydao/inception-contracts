module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  console.log('')
  console.log('== Governance timelock deployment ==')

  const { deploy, get } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()

  try {
    const deplpoyment = await get('StabilityDAO')
    console.log(
      `GovTimelock already deployed to ${hre.network.name} at ${deplpoyment.address}`
    )
    return
  } catch (e) {
    // not deployed yet
  }

  let minDelay = 100
  if (hre.network.name == 'mainnet') {
    minDelay = 1000
  }

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('Timelock minDelay:', minDelay)

  await deploy('StabilityDAO', {
    from: deployer,
    log: true,
    args: [minDelay, [], []],
  })
}

module.exports.tags = ['GovTimelock']
