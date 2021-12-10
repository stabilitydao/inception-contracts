const { ethers, upgrades } = require('hardhat')
const { expect } = require('chai')

describe('DividendMinter', function () {
  before(async function () {
    this.ProfitToken = await ethers.getContractFactory('ProfitToken')
    this.DividendToken = await ethers.getContractFactory('DividendToken')
    this.DividendMinter = await ethers.getContractFactory('DividendMinter')
    const [devFund, tester] = await ethers.getSigners()
    this.devFund = devFund
    this.tester = tester
  })

  beforeEach(async function () {
    this.token = await this.ProfitToken.deploy(this.devFund.address)
    await this.token.deployed()

    this.dividendToken = await upgrades.deployProxy(this.DividendToken, {
      kind: 'uups',
    })

    await this.dividendToken.deployed()

    this.dividendMinter = await upgrades.deployProxy(
      this.DividendMinter,
      [this.token.address, this.dividendToken.address, 1, 100000],
      {
        kind: 'uups',
      }
    )
  })

  it('deployed', async function () {
    expect(await this.dividendMinter.stakeToken()).to.equal(this.token.address)
    expect(await this.dividendMinter.rewardToken()).to.equal(
      this.dividendToken.address
    )
  })

  it('stake, update', async function () {
    await this.token
      .connect(this.devFund)
      .approve(this.dividendMinter.address, 10)

    await expect(this.dividendMinter.connect(this.devFund).stake(9)).to.not.be
      .reverted

    await expect(this.dividendMinter.update()).to.not.be.reverted
  })
})
