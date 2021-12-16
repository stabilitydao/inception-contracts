import { artifacts, waffle, ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import {
  DividendMinter,
  DividendMinter__factory,
  DividendToken,
  DividendToken__factory,
  ProfitToken,
} from '../typechain-types'

describe('DividendMinter', function () {
  let profitToken: ProfitToken
  let dToken: DividendToken
  let dPool: DividendMinter
  let _deployer: SignerWithAddress
  let _devFund: SignerWithAddress
  let _tester: SignerWithAddress

  before(async function () {
    const [deployer, tester, devFund] = await ethers.getSigners()
    _deployer = deployer
    _tester = tester
    _devFund = devFund
  })

  beforeEach(async function () {
    const dTokenFactory = (await ethers.getContractFactory(
      'DividendToken',
      _deployer
    )) as DividendToken__factory

    dToken = (await upgrades.deployProxy(dTokenFactory, {
      kind: 'uups',
    })) as DividendToken

    await dToken.deployed()

    profitToken = <ProfitToken>(
      await waffle.deployContract(
        _deployer,
        await artifacts.readArtifact('ProfitToken'),
        [_devFund.address]
      )
    )
    await profitToken.deployed()

    const dPoolFactory = (await ethers.getContractFactory(
      'DividendMinter',
      _deployer
    )) as DividendMinter__factory

    dPool = (await upgrades.deployProxy(
      dPoolFactory,
      [profitToken.address, dToken.address, 1, 100000],
      {
        kind: 'uups',
      }
    )) as DividendMinter

    await dPool.deployed()
  })

  it('deployed', async function () {
    expect(await dPool.stakeToken()).to.equal(profitToken.address)
    expect(await dPool.rewardToken()).to.equal(dToken.address)
    expect(await dPool.rewardTokensPerBlock()).to.eq(1)
  })

  it('stake, update', async function () {
    await profitToken.connect(_devFund).approve(dPool.address, 10)

    await expect(dPool.connect(_devFund).stake(9)).to.not.be.reverted

    await expect(dPool.update()).to.not.be.reverted
    await expect(dPool.connect(_devFund).harvest()).to.not.be.reverted
    await expect(dPool.connect(_devFund).unstake(5)).to.not.be.reverted
    await dPool.pending(_devFund.address)
    await dPool.connect(_devFund).emergencyWithdraw()
  })
})
