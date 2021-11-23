module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  console.log('')
  console.log('==== L2 PolyProfitToken deployment to', hre.network.name, '====')

  const { deploy } = deployments,
    { deployer, polygonBridge, devFund } = await getNamedAccounts(),
    chainId = await getChainId()

  console.log('ChainId:', chainId)
  console.log('Network name:', hre.network.name)
  console.log('Deployer address:', deployer)
  console.log('L2 Standard Bridge:', polygonBridge)
  console.log('Development Fund address:', devFund)

  await deploy('PolyProfitToken', {
    from: deployer,
    log: true,
    args: [polygonBridge, devFund],
  })
}

module.exports.tags = ['PolyProfitToken']
module.exports.dependencies = ['ProfitToken']
