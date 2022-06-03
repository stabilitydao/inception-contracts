const { ethers, upgrades } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  // type proxy address for upgrade contract
  // deployer must have UPGRADER_ROLE
  // polygon 0x9844a1c30462B55cd383A2C06f90BB4171f9D4bB
  // mumbai 0x21160EA4ebc4E644777514774965a506a98D01c6
  // ropsten 0x424E1eAe04a2580EcD4d5f19Ad5285cC2b05a05C
  const upgradeProxy = null // '0x424E1eAe04a2580EcD4d5f19Ad5285cC2b05a05C' (ropsten)

  const { save, get } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()

  console.log('')

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    console.log(`== DividendToken deployment to ${hre.network.name} ==`)
    try {
      const deplpoyment = await get('DividendToken')
      console.log(
        `DividendToken already deployed to ${hre.network.name} at ${deplpoyment.address}`
      )
      return
    } catch (e) {
      // not deployed yet
    }
  } else {
    console.log(`==== DividendToken upgrade at ${hre.network.name} ====`)
    console.log(`Proxy address: ${upgradeProxy}`)
  }

  console.log('ChainId:', chainId)
  console.log('Deployer address:', deployer)
  // console.log('Development Fund address:', devFund)

  // noinspection PointlessBooleanExpressionJS
  if (!upgradeProxy) {
    // https://docs.openzeppelin.com/upgrades-plugins/1.x/hardhat-upgrades
    // https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786
    // https://www.youtube.com/watch?v=kWUDTZhxKZI
    // https://forum.openzeppelin.com/t/integrating-hardhat-deploy-and-openzeppelin-hardhat-upgrades/5585/2
    const DividendToken = await ethers.getContractFactory('DividendToken')
    const dToken = await upgrades.deployProxy(DividendToken, {
      kind: 'uups',
    })

    await dToken.deployed()

    const artifact = await hre.artifacts.readArtifact('DividendToken')

    await save('DividendToken', {
      address: dToken.address,
      abi: artifact.abi,
    })

    let receipt = await dToken.deployTransaction.wait()
    console.log(
      `DividendToken proxy deployed at: ${dToken.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )
  } else {
    // try to upgrade
    const DividendToken = await ethers.getContractFactory('DividendToken')
    const dToken = await upgrades.upgradeProxy(upgradeProxy, DividendToken)

    const artifact = await hre.artifacts.readArtifact('DividendToken')

    await save('DividendToken', {
      address: dToken.address,
      abi: artifact.abi,
    })

    let receipt = await dToken.deployTransaction.wait()
    console.log(
      `DividendToken upgraded through proxy: ${dToken.address} (block: ${
        receipt.blockNumber
      }) with ${receipt.gasUsed.toNumber()} gas`
    )

    // hardhat verify --network r.. 0x
  }
}

module.exports.tags = ['DividendToken']
