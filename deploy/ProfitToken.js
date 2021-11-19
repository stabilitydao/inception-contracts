module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  console.log('== L1 ProfitToken deployment to', hre.network.name, '==')

  const { deploy } = deployments
  const { deployer, devFund } = await getNamedAccounts()
  const totalSupply = 1000000
  const chainId = await getChainId()

  console.log('ChainId:', chainId)
  console.log('Deployer:', deployer)
  console.log('Development Fund:', devFund)
  console.log('Total supply:', totalSupply)

  await deploy('ProfitToken', {
    from: deployer,
    log: true,
    args: [devFund],
  })
}

module.exports.tags = ['ProfitToken']
