import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import {
  DividendToken__factory,
  DividendToken,
  ProfitPayer,
  ProfitPayer__factory,
  ProfitToken,
  ProfitToken__factory,
} from '../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('ProfitPayer', function () {
  let dToken: DividendToken
  let profitToken: ProfitToken
  let ePayer: ProfitPayer
  let _deployer: SignerWithAddress
  let _devFund: SignerWithAddress
  let _tester: SignerWithAddress

  beforeEach(async function () {
    const [deployer, tester, devFund] = await ethers.getSigners()

    _deployer = deployer
    _tester = tester
    _devFund = devFund

    const profitTokenFactory = (await ethers.getContractFactory(
      'ProfitToken'
    )) as ProfitToken__factory
    profitToken = await profitTokenFactory.deploy(_devFund.address)
    await profitToken.deployed()

    const dTokenFactory = (await ethers.getContractFactory(
      'DividendToken',
      deployer
    )) as DividendToken__factory

    dToken = (await upgrades.deployProxy(dTokenFactory, {
      kind: 'uups',
    })) as DividendToken

    await dToken.deployed()

    const ePayerFactory = (await ethers.getContractFactory(
      'ProfitPayer',
      deployer
    )) as ProfitPayer__factory

    ePayer = (await upgrades.deployProxy(
      ePayerFactory,
      [dToken.address, profitToken.address],
      {
        kind: 'uups',
      }
    )) as ProfitPayer

    await ePayer.deployed()
    await dToken.grantRole(ethers.utils.id('SNAPSHOT_ROLE'), ePayer.address)
    await dToken.grantRole(ethers.utils.id('MINTER_ROLE'), _devFund.address)
    await dToken.connect(_devFund).mint(_tester.address, 10)
  })

  it('Upgrades', async function () {
    const ePayerFactory = (await ethers.getContractFactory(
      'ProfitPayer',
      _deployer
    )) as ProfitPayer__factory

    ePayer = (await upgrades.upgradeProxy(
      ePayer.address,
      ePayerFactory
    )) as ProfitPayer

    await ePayer.deployed()
  })

  it('Pays', async function () {
    await profitToken.connect(_devFund).approve(ePayer.address, 10)
    await ePayer.receivePayment(_devFund.address, 2)
    expect(await ePayer.connect(_tester).paymentPending(_tester.address)).to.eq(
      2
    )

    await ePayer.receivedPaymentsData(0)

    await ePayer.connect(_tester).releasePayment()

    await ePayer.releasedPaymentsData(_tester.address, 0)

    expect(await ePayer.connect(_tester).paymentPending(_tester.address)).to.eq(
      0
    )

    await ePayer.receivePayment(_devFund.address, 3)
    await ePayer.connect(_tester).releasePayment()
    expect(await profitToken.balanceOf(_tester.address)).to.eq(3 + 2)
    await expect(ePayer.connect(_tester).releasePayment()).to.be.revertedWith(
      'Account is not due any payment'
    )

    expect(await ePayer.receivedPaymentsCount()).to.eq(1 + 1)

    expect(await ePayer.totalReceivedFrom(_devFund.address)).to.eq(3 + 2)
    expect(await ePayer.totalPaidTo(_tester.address)).to.eq(3 + 2)
    expect(await ePayer.releasedPaymentsCount(_tester.address)).to.eq(1 + 1)
    expect(await ePayer.totalPaid()).to.eq(3 + 2)
    expect(await ePayer.totalReceived()).to.eq(3 + 2)
  })

  it('Can be drained', async function () {
    await profitToken.connect(_devFund).approve(ePayer.address, 100)
    await ePayer.receivePayment(_devFund.address, 5)

    await expect(
      ePayer
        .connect(_devFund)
        .drainMinterShare(_tester.address, _devFund.address)
    ).to.be.revertedWith('Ownable: caller is not the owner')

    expect(await ePayer.connect(_tester).paymentPending(_tester.address)).to.eq(
      5
    )

    await ePayer
      .connect(_deployer)
      .drainMinterShare(_tester.address, _devFund.address)

    expect(await ePayer.connect(_tester).paymentPending(_tester.address)).to.eq(
      0
    )
  })
})
