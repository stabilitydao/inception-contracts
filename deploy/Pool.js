module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  console.log('')
  console.log('== Pool deployment to', hre.network.name, '==')

  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()

  const token = await deployments.get('ProfitToken')
  const timelock = await deployments.get('GovTimelock')

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('ProfitToken address:', token.address)
  console.log('GovTimelock address:', timelock.address)

  let wethAddr
  if (chainId == 1337) {
    const weth = await deploy('WETH9', {
      from: deployer,
      log: true,
    })
    wethAddr = weth.address
  } else if (hre.network.name == 'mainnet') {
    // https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    wethAddr = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  } else if (hre.network.name == 'ropsten') {
    // https://ropsten.etherscan.io/token/0xc778417e063141139fce010982780140aa0cd5ab
    wethAddr = '0xc778417E063141139Fce010982780140Aa0cD5Ab'
  } else if (hre.network.name == 'rinkeby') {
    // https://rinkeby.etherscan.io/token/0xc778417e063141139fce010982780140aa0cd5ab
    wethAddr = '0xc778417E063141139Fce010982780140Aa0cD5Ab'
  } else if (hre.network.name == 'goerli') {
    // https://goerli.etherscan.io/token/0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6
    wethAddr = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6'
  } else if (hre.network.name == 'kovan') {
    // https://kovan.etherscan.io/token/0xd0a1e359811322d97991e03f863a0c30c2cf029c
    wethAddr = '0xd0A1E359811322d97991E03f863a0C30C2cF029C'
  } else {
    throw new Error('Unsupported network')
  }

  console.log('WETH9 address:', wethAddr)

  const pool = await deploy('Pool', {
    from: deployer,
    log: true,
    args: [wethAddr, token.address],
  })

  console.log('Pool address:', pool.address)

  const poolContract = await ethers.getContractAt('Pool', pool.address)

  let tx = await poolContract.transferOwnership(timelock.address)

  console.log(`Pool ownership transferred to GovTimelock (tx: ${tx.hash})`)
}

module.exports.tags = ['Pool']
module.exports.dependencies = ['ProfitToken', 'GovTimelock', 'Gov']
