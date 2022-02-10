import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('Protif token', function () {
  before(async function () {
    this.Token = await ethers.getContractFactory('ProfitToken')
    const [devFund, tester] = await ethers.getSigners()
    this.devFund = devFund
    this.tester = tester
  })

  beforeEach(async function () {
    this.token = await this.Token.deploy(this.devFund.address)
    await this.token.deployed()
  })

  it('Deployment should assign the total supply of tokens to the devFund', async function () {
    const devFundBalance = await this.token.balanceOf(this.devFund.address)
    expect(await this.token.totalSupply()).to.equal(devFundBalance)
  })

  it('should have correct name and symbol and decimal', async function () {
    expect(await this.token.name()).to.be.equal('Stability')
    expect(await this.token.symbol()).to.be.equal('PROFIT')
    expect(await this.token.decimals()).to.be.equal(18)
  })

  it('Transfer emits event', async function () {
    await expect(this.token.transfer(this.tester.address, 7))
      .to.emit(this.token, 'Transfer')
      .withArgs(this.devFund.address, this.tester.address, 7)
  })

  it('Can burn only own tokens', async function () {
    await this.token.transfer(this.tester.address, 12)
    await expect(this.token.connect(this.tester).burn(12)).to.not.be.reverted
    await expect(this.token.connect(this.tester).burn(1)).to.be.reverted
  })

  it('Can burnFrom only allowed tokens', async function () {
    await expect(
      this.token.burnFrom(this.devFund.address, 1)
    ).to.be.revertedWith('ERC20: insufficient allowance')
    await this.token.approve(this.devFund.address, 8)
    await expect(this.token.burnFrom(this.devFund.address, 7)).to.not.be
      .reverted
    await expect(
      this.token.burnFrom(this.devFund.address, 2)
    ).to.be.revertedWith('ERC20: insufficient allowance')
    await this.token.increaseAllowance(this.devFund.address, 2)
    await expect(this.token.burnFrom(this.devFund.address, 2)).to.not.be
      .reverted
    await this.token.decreaseAllowance(this.devFund.address, 1)
    await expect(
      this.token.burnFrom(this.devFund.address, 2)
    ).to.be.revertedWith('ERC20: insufficient allowance')
  })

  it('Can burnFrom only allowed tokens', async function () {
    await expect(
      this.token.transferFrom(this.devFund.address, this.tester.address, 10)
    ).to.be.revertedWith('ERC20: insufficient allowance')
    await this.token.approve(this.devFund.address, 10)
    await expect(
      this.token.transferFrom(this.devFund.address, this.tester.address, 10)
    ).to.not.be.reverted
  })

  it('Is votes delegation work', async function () {
    await this.token.connect(this.devFund).delegate(this.tester.address)
    const ckpts = await this.token.numCheckpoints(this.tester.address)
    const votes = await this.token.getVotes(this.tester.address)
    const totalSupply = await this.token.totalSupply()
    expect(ckpts).to.be.equal(1)
    expect(votes).to.be.equal(totalSupply)
  })
})
