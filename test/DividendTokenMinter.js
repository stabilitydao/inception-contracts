const { ethers, upgrades } = require('hardhat')
const { expect } = require('chai')

describe('DividendTokenMinter', function () {
  before(async function () {
    this.ProfitToken = await ethers.getContractFactory('ProfitToken')
    this.DividendToken = await ethers.getContractFactory('DividendToken')
    this.DividendMinter = await ethers.getContractFactory('DividendTokenMinter')
    const [devFund, tester] = await ethers.getSigners()
    this.devFund = devFund
    this.tester = tester
  })

  beforeEach(async function () {
    this.token = await this.ProfitToken.deploy(this.devFund.address)
    await this.token.deployed()

    this.dividendToken = await upgrades.deployProxy(
      this.DividendToken,
      [this.devFund.address],
      {
        kind: 'uups',
      }
    )

    await this.dividendToken.deployed()

    this.dividendTokenMinter = await upgrades.deployProxy(
      this.DividendMinter,
      [
        this.token.address,
        this.dividendToken.address,
        1,
        100000,
        this.devFund.address,
      ],
      {
        kind: 'uups',
      }
    )
  })

  it('deployed', async function () {
    expect(await this.dividendTokenMinter.stakeToken()).to.equal(
      this.token.address
    )
    expect(await this.dividendTokenMinter.rewardToken()).to.equal(
      this.dividendToken.address
    )
  })

  it('stake, update', async function () {
    await this.token
      .connect(this.devFund)
      .approve(this.dividendTokenMinter.address, 10)

    await expect(this.dividendTokenMinter.connect(this.devFund).stake(9)).to.not
      .be.reverted

    await expect(this.dividendTokenMinter.update()).to.not.be.reverted
  })
})
