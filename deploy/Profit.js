module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
    console.log('')
    console.log('== Profit deployment to', hre.network.name, '==')
  
    const { deploy, get } = deployments
    const { deployer, devFund } = await getNamedAccounts()
    const chainId = await getChainId()
  
    try {
      const deplpoyment = await get('Profit')
      console.log(
        `Profit already deployed to ${hre.network.name} at ${deplpoyment.address}`
      )
      return
    } catch (e) {
      // not deployed yet
    }
  
    console.log('ChainId:', chainId)
    console.log('Deployer address:', deployer)
  
    await deploy('Profit', {
      from: deployer,
      log: true,
    })
  }
  
  module.exports.tags = ['Profit']
  