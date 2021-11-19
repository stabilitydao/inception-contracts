const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('OptimisticProfitToken contract', function () {
  before(async function () {
    this.Token = await ethers.getContractFactory('ProfitToken')
    this.L2Token = await ethers.getContractFactory('OptimisticProfitToken')
    const [devFund, tester, optimisticBridge] = await ethers.getSigners()
    this.devFund = devFund
    this.tester = tester
    this.bridge = optimisticBridge
  })

  beforeEach(async function () {
    this.token = await this.Token.deploy(this.devFund.address)
    await this.token.deployed()
    this.l2token = await this.L2Token.deploy(this.bridge.address,this.token.address)
    await this.l2token.deployed()
  })

  it('should have correct name and symbol and decimal', async function () {
    expect(await this.l2token.name()).to.be.equal('Stability')
    expect(await this.l2token.symbol()).to.be.equal('PROFIT')
    expect(await this.l2token.decimals()).to.be.equal(18)
  })

  it('Only L2 Bridge can mint and burn', async function () {
    await expect(this.l2token.mint(this.tester.address, 10))
        .to.be.revertedWith('Only L2 Bridge can mint and burn')

    await expect(this.l2token.connect(this.bridge).mint(this.tester.address, 10))
        .to.emit(this.l2token, 'Mint')
        .withArgs(this.tester.address, 10)

    await expect(this.l2token.connect(this.bridge).burn(this.tester.address, 10))
        .to.emit(this.l2token, 'Burn')
        .withArgs(this.tester.address, 10)
  })

  it('Transfer emits event', async function () {
    await this.l2token.connect(this.bridge).mint(this.tester.address, 10)

    await expect(this.l2token.connect(this.tester).transfer(this.devFund.address, 10))
        .to.emit(this.l2token, 'Transfer')
        .withArgs(this.tester.address, this.devFund.address, 10)

    await expect(this.l2token.connect(this.tester).transfer(this.devFund.address, 1))
        .to.be.revertedWith('ERC20: transfer amount exceeds balance')
  })
})
