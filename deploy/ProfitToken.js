module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  console.log('')
  console.log('== ProfitToken deployment to', hre.network.name, '==')

  const { deploy, get } = deployments
  const { deployer, devFund } = await getNamedAccounts()
  const totalSupply = 1000000
  const chainId = await getChainId()

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('Development Fund address:', devFund)
  console.log('Total supply:', totalSupply)

  try {
    const deplpoyment = await get('ProfitToken');
    console.log(`ProfitToken already deployed to ${hre.network.name} at ${deplpoyment.address}`)
    return;
  } catch (e) {
    // not deployed yet
  }

  await deploy('ProfitToken', {
    from: deployer,
    log: true,
    args: [devFund],
  })
}

module.exports.tags = ['ProfitToken']
