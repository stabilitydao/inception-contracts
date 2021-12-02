const { ethers, upgrades } = require('hardhat')

describe('DividendMinter', function () {
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
  })

  it('deploys', async function () {
    await upgrades.deployProxy(
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
})
