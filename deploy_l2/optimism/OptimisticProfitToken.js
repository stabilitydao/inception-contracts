module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  console.log('')
  console.log('==== L2 OptimisticProfitToken deployment to', hre.network.name, '====')

  const
      { deploy } = deployments,
      { deployer, optimisticBridge } = await getNamedAccounts(),
      chainId = await getChainId()

  let l1Token;
  if (hre.network.name == 'hardhat') {
    const token = await deployments.get('ProfitToken')
    l1Token = token.address  // hardhat L1 token address
  } else if (hre.network.name == 'optimistic-kovan') {
    l1Token = '0x108aBca337e88a9fc1DE96b0ec323f476b35cD44'  // Kovan L1 token address
  } else if (hre.network.name == 'optimistic-mainnet') {
    l1Token = '0x3fa5F9c876BEbB41B8924633850b1a9922f7E4F9'  // Mainnet L1 token address
  } else {
    throw Error("Unsupported network")
  }

  console.log('ChainId:', chainId)
  console.log('Network name:', hre.network.name)
  console.log('Deployer:', deployer)
  console.log('L1 Token:', l1Token)
  console.log('L2 Standard Bridge:', optimisticBridge)

  await deploy('OptimisticProfitToken', {
    from: deployer,
    log: true,
    args: [optimisticBridge, l1Token],
  })
}

module.exports.tags = ['OptimisticProfitToken']
module.exports.dependencies = ['ProfitToken']
