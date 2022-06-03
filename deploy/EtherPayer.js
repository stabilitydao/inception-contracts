const { ethers, upgrades } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  // type proxy address for upgrade contract
  // deployer must have upgrade access
  const upgradeProxy = null // ropsten: '0x6BaF629618551Cb7454013F67f5d4A9119A61627', mumbai: '0x4dC2E6Bd77842DAf7890205DFe14aC86FbC61421', polygon: '0xf81FCd61b18BAb470418161B6cFaF95a3796762b'

  const { save, get, deploy } = deployments
  const { deployer, devFund } = await getNamedAccounts()
  const chainId = await getChainId()

  console.log('')

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    console.log(`== EtherPayer deployment to ${hre.network.name} ==`)
    try {
      const deplpoyment = await get('EtherPayer')
      console.log(
        `EtherPayer already deployed to ${hre.network.name} at ${deplpoyment.address}`
      )
      return
    } catch (e) {
      // not deployed yet
    }
  } else {
    console.log(`==== EtherPayer upgrade at ${hre.network.name} ====`)
    console.log(`Proxy address: ${upgradeProxy}`)
  }

  const dToken = await deployments.get('DividendToken')

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  console.log('Development Fund address:', devFund)
  console.log('DividendToken address:', dToken.address)

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    const EtherPayer = await ethers.getContractFactory('EtherPayer')

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
    } else if (hre.network.name == 'polygon') {
      // https://polygonscan.com/token/0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619
      wethAddr = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
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
    } else if (hre.network.name == 'mumbai') {
      // wrapped ether bridged from goerli
      // https://mumbai.polygonscan.com/token/0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa
      wethAddr = '0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa'
    } else {
      throw new Error('Unsupported network')
    }

    const etherPayer = await upgrades.deployProxy(
      EtherPayer,
      [dToken.address, wethAddr],
      {
        kind: 'uups',
      }
    )

    await etherPayer.deployed()

    const artifact = await hre.artifacts.readArtifact('EtherPayer')

    await save('EtherPayer', {
      address: etherPayer.address,
      abi: artifact.abi,
    })

    let receipt = await etherPayer.deployTransaction.wait()
    console.log(
      `EtherPayer proxy deployed at: ${etherPayer.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // grant snapshot role to payer from dtoken
    const SNAPSHOT_ROLE = ethers.utils.id('SNAPSHOT_ROLE')

    const dTokenContract = await ethers.getContractAt(
      'DividendToken',
      dToken.address
    )

    let tx = await dTokenContract.grantRole(SNAPSHOT_ROLE, etherPayer.address)
    process.stdout.write(
      `Grant DividendToken SNAPSHOT_ROLE to EthPayer (tx: ${tx.hash})...: `
    )

    receipt = await tx.wait()
    if (receipt.status) {
      console.log(
        `done (block: ${
          receipt.blockNumber
        }) with ${receipt.gasUsed.toNumber()} gas`
      )
    } else {
      console.log(`REVERTED!`)
    }
  } else {
    // try to upgrade
    const EtherPayer = await ethers.getContractFactory('EtherPayer')
    const etherPayer = await upgrades.upgradeProxy(upgradeProxy, EtherPayer)

    const artifact = await hre.artifacts.readArtifact('EtherPayer')

    await save('EtherPayer', {
      address: etherPayer.address,
      abi: artifact.abi,
    })

    let receipt = await etherPayer.deployTransaction.wait()
    console.log(
      `EtherPayer upgraded through proxy: ${etherPayer.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // hardhat verify --network r.. 0x
  }
}

module.exports.tags = ['EtherPayer']
module.exports.dependencies = ['DividendToken']
