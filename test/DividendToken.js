const { ethers, upgrades } = require('hardhat')

describe('DividendToken', function () {
  before(async function () {
    this.DividendToken = await ethers.getContractFactory('DividendToken')
    const [devFund, tester] = await ethers.getSigners()
    this.devFund = devFund
    this.tester = tester
  })

  it('deploys', async function () {
    await upgrades.deployProxy(this.DividendToken, {
      kind: 'uups',
    })
  })
})
