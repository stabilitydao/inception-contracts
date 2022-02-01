import { artifacts, waffle, ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import {
  DividendToken,
  DividendToken__factory,
  EtherPayer,
  EtherPayer__factory,
  Splitter,
  Splitter__factory,
  Treasure,
  WETH9,
} from '../typechain-types'

describe('Splitter', function () {
  let splitter: Splitter
  let wEth: WETH9
  let timelock: Treasure
  let ePayer: EtherPayer
  let dToken: DividendToken
  let _deployer: SignerWithAddress
  let _devFund: SignerWithAddress
  let _tester: SignerWithAddress

  beforeEach(async function () {
    const [deployer, tester, devFund] = await ethers.getSigners()

    _deployer = deployer
    _tester = tester
    _devFund = devFund

    timelock = <Treasure>(
      await waffle.deployContract(
        _deployer,
        await artifacts.readArtifact('Treasure'),
        [10, [], []]
      )
    )
    await timelock.deployed()

    const splitterFactory = (await ethers.getContractFactory(
      'Splitter',
      _deployer
    )) as Splitter__factory

    splitter = (await upgrades.deployProxy(
      splitterFactory,
      [40, 30, 30, timelock.address, _devFund.address],
      {
        kind: 'uups',
      }
    )) as Splitter

    await splitter.deployed()

    wEth = <WETH9>(
      await waffle.deployContract(
        _deployer,
        await artifacts.readArtifact('WETH9')
      )
    )
    await wEth.deployed()

    const dTokenFactory = (await ethers.getContractFactory(
      'DividendToken',
      _deployer
    )) as DividendToken__factory

    dToken = (await upgrades.deployProxy(dTokenFactory, {
      kind: 'uups',
    })) as DividendToken

    await dToken.deployed()

    const ePayerFactory = (await ethers.getContractFactory(
      'EtherPayer',
      _deployer
    )) as EtherPayer__factory

    ePayer = (await upgrades.deployProxy(
      ePayerFactory,
      [dToken.address, wEth.address],
      {
        kind: 'uups',
      }
    )) as EtherPayer

    await ePayer.deployed()
  })

  it('Upgrades', async function () {
    const splitterFactory = (await ethers.getContractFactory(
      'Splitter',
      _deployer
    )) as Splitter__factory

    await expect(
      upgrades.upgradeProxy(splitter.address, splitterFactory)
    ).to.be.revertedWith('is missing role')

    await splitter.grantRole(
      ethers.utils.id('UPGRADER_ROLE'),
      _deployer.address
    )

    splitter = (await upgrades.upgradeProxy(
      splitter.address,
      splitterFactory
    )) as Splitter

    await splitter.deployed()
  })

  it('Split', async function () {
    // fill splitter with 100 weth
    await _deployer.sendTransaction({
      to: wEth.address,
      value: ethers.utils.parseEther('100'),
    })
    await wEth.transfer(splitter.address, ethers.utils.parseEther('100'))

    await expect(splitter.run(wEth.address, ePayer.address)).to.be.revertedWith(
      'is missing role'
    )

    await splitter.grantRole(
      ethers.utils.id('EXECUTOR_ROLE'),
      _deployer.address
    )

    await expect(splitter.run(wEth.address, ePayer.address)).to.be.revertedWith(
      'no share holder'
    )

    await dToken.grantRole(ethers.utils.id('MINTER_ROLE'), _deployer.address)
    await dToken.mint(_deployer.address, 1)

    await expect(splitter.run(wEth.address, ePayer.address)).to.be.revertedWith(
      'is missing role'
    )

    await dToken.grantRole(ethers.utils.id('SNAPSHOT_ROLE'), ePayer.address)

    await expect(splitter.run(wEth.address, ePayer.address)).to.be.not.reverted

    expect(await wEth.balanceOf(timelock.address)).to.eq(
      ethers.utils.parseEther('30')
    )
    expect(await wEth.balanceOf(_devFund.address)).to.eq(
      ethers.utils.parseEther('30')
    )

    await expect(ePayer.releasePayment()).to.be.not.reverted
  })

  it('Changes', async function () {
    await expect(splitter.change(1, 1, 1)).to.be.revertedWith('is missing role')
    await splitter.grantRole(ethers.utils.id('CHANGER_ROLE'), _deployer.address)
    await expect(splitter.change(1, 1, 1)).to.be.revertedWith('is not 100')
    await expect(splitter.change(1, 1, 98)).to.be.revertedWith(
      'Too little dividend'
    )
    await expect(splitter.change(98, 1, 1)).to.be.revertedWith(
      'Too much dividend'
    )
    await expect(splitter.change(10, 1, 89)).to.be.revertedWith('Few treasures')
    await expect(splitter.change(10, 80, 10)).to.be.revertedWith(
      'Many treasures'
    )
    await expect(splitter.change(40, 30, 30)).to.not.be.reverted
    expect(await splitter.div()).to.eq(40)
    expect(await splitter.gov()).to.eq(30)
    expect(await splitter.dev()).to.eq(30)
  })

  it('Emit events', async function () {
    await splitter.grantRole(ethers.utils.id('CHANGER_ROLE'), _deployer.address)

    await expect(splitter.change(40, 30, 30))
      .to.emit(splitter, 'Changed')
      .withArgs(40, 30, 30)
  })
})
