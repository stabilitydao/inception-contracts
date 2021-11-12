module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  console.log('== ProfitToken deployment ==')

  const { deploy } = deployments
  const { deployer, devFund } = await getNamedAccounts()
  const totalSupply = 1000000
  const chainId = await getChainId()

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('Development Fund address:', devFund)
  console.log('Total supply:', totalSupply)

  await deploy('ProfitToken', {
    from: deployer,
    log: true,
    args: [devFund],
  })
}

module.exports.tags = ['ProfitToken']
