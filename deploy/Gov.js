module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  console.log('')
  console.log('== Timelocked Governance deployment to', hre.network.name, '==')

  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()

  const token = await deployments.get('ProfitToken')
  const timelock = await deployments.get('GovTimelock')

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('ProfitToken address:', token.address)
  console.log('GovTimelock address:', timelock.address)

  let votingDelay = 272 // 1 hour
  let votingPeriod = 6545 // 1 day
  let proposalThreshold = 0

  if (hre.network.name == 'mainnet') {
    votingDelay = 6545 // 1 day
    votingPeriod = 45815 // 1 week
  }

  const gov = await deploy('Gov', {
    from: deployer,
    log: true,
    args: [
      token.address,
      timelock.address,
      votingDelay,
      votingPeriod,
      proposalThreshold,
    ],
  })

  console.log('Gov address:', gov.address)

  const timelockContract = await ethers.getContractAt(
    'GovTimelock',
    timelock.address
  )

  const TIMELOCK_ADMIN_ROLE = ethers.utils.id('TIMELOCK_ADMIN_ROLE')
  const PROPOSER_ROLE = ethers.utils.id('PROPOSER_ROLE')

  let tx = await timelockContract.grantRole(PROPOSER_ROLE, gov.address)

  console.log(`Grant timelock proposer role to governance (tx: ${tx.hash})`)

  tx = await timelockContract.revokeRole(TIMELOCK_ADMIN_ROLE, timelock.address)

  console.log(
    `Revoke timelock admin role from timelock itself (tx: ${tx.hash})`
  )

  tx = await timelockContract.renounceRole(TIMELOCK_ADMIN_ROLE, deployer)

  console.log(`Renounce timelock admin role from deployer (tx: ${tx.hash})`)
}

module.exports.tags = ['Gov']
module.exports.dependencies = ['ProfitToken', 'GovTimelock']
