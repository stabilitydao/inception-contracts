const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('PolyProfitToken contract', function () {
  before(async function () {
    this.Token = await ethers.getContractFactory('ProfitToken')
    this.L2Token = await ethers.getContractFactory('PolyProfitToken')
    const [devFund, tester, polygonBridge] = await ethers.getSigners()
    this.devFund = devFund
    this.tester = tester
    this.bridge = polygonBridge
    this.AbiCoder = new ethers.utils.AbiCoder()
  })

  beforeEach(async function () {
    this.token = await this.Token.deploy(this.devFund.address)
    await this.token.deployed()
    this.l2token = await this.L2Token.deploy(
      this.bridge.address,
      this.devFund.address
    )
    await this.l2token.deployed()
  })

  it('should have correct name and symbol and decimal', async function () {
    expect(await this.l2token.name()).to.be.equal('Stability')
    expect(await this.l2token.symbol()).to.be.equal('PROFIT')
    expect(await this.l2token.decimals()).to.be.equal(18)
  })

  it('Only L2 Bridge can mint and burn', async function () {
    await expect(
      this.l2token.deposit(
        this.tester.address,
        this.AbiCoder.encode(['uint'], [10])
      )
    ).to.be.revertedWith("You're not allowed to deposit")

    await expect(
      this.l2token
        .connect(this.bridge)
        .deposit(this.tester.address, this.AbiCoder.encode(['uint'], [10]))
    )
      .to.emit(this.l2token, 'Transfer')
      .withArgs(
        '0x0000000000000000000000000000000000000000',
        this.tester.address,
        10
      )

    await expect(this.l2token.connect(this.tester).withdraw(10))
      .to.emit(this.l2token, 'Transfer')
      .withArgs(
        this.tester.address,
        '0x0000000000000000000000000000000000000000',
        10
      )
  })

  it('Transfer emits event', async function () {
    await this.l2token
      .connect(this.bridge)
      .deposit(this.tester.address, this.AbiCoder.encode(['uint'], [10]))

    await expect(
      this.l2token.connect(this.tester).transfer(this.devFund.address, 10)
    )
      .to.emit(this.l2token, 'Transfer')
      .withArgs(this.tester.address, this.devFund.address, 10)

    await expect(
      this.l2token.connect(this.tester).transfer(this.devFund.address, 1)
    ).to.be.revertedWith('ERC20: transfer amount exceeds balance')
  })

  it('Update childChainManagerProxy', async function () {
    await expect(
      this.l2token
        .connect(this.tester)
        .updateChildChainManager(this.devFund.address)
    ).to.be.revertedWith("You're not allowed.")

    await expect(
      this.l2token
        .connect(this.tester)
        .updateChildChainManager('0x0000000000000000000000000000000000000000')
    ).to.be.revertedWith('Bad new proxy address')

    await this.l2token
      .connect(this.devFund)
      .updateChildChainManager(this.tester.address)

    await expect(await this.l2token.childChainManagerProxy()).to.be.equal(
      this.tester.address
    )
  })
})
