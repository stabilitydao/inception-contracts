import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { DividendToken, DividendToken__factory } from '../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('DividendToken', function () {
  let dToken: DividendToken
  let _deployer: SignerWithAddress
  let _tester: SignerWithAddress
  let _tester2: SignerWithAddress
  let _tester3: SignerWithAddress

  beforeEach(async function () {
    ;[_deployer, _tester, _tester2, _tester3] = await ethers.getSigners()

    const dTokenFactory = (await ethers.getContractFactory(
      'DividendToken',
      _deployer
    )) as DividendToken__factory

    dToken = (await upgrades.deployProxy(dTokenFactory, {
      kind: 'uups',
    })) as DividendToken

    await dToken.deployed()
  })

  it('Upgrades', async function () {
    // this test keeps only for coverage of function _authorizeUpgrade
    await dToken.grantRole(ethers.utils.id('UPGRADER_ROLE'), _deployer.address)

    dToken = (await upgrades.upgradeProxy(
      dToken.address,
      await ethers.getContractFactory('DividendToken')
    )) as DividendToken

    await dToken.deployed()
  })

  it('Genesys metadata', async function () {
    expect(await dToken.name()).to.be.equal('Stability Dividend')
    expect(await dToken.symbol()).to.be.equal('SDIV')
    expect(await dToken.totalSupply()).to.be.equal(0)
  })

  it('Mints', async function () {
    await dToken.grantRole(ethers.utils.id('MINTER_ROLE'), _tester.address)
    await dToken.connect(_tester).mint(_tester.address, 1)
    expect(await dToken.totalSupply()).to.be.equal(1)
  })

  it('Snapshots', async function () {
    await dToken.grantRole(ethers.utils.id('SNAPSHOT_ROLE'), _tester.address)
    await dToken.grantRole(ethers.utils.id('MINTER_ROLE'), _deployer.address)
    await dToken.mint(_tester.address, 1)
    await (await dToken.connect(_tester).snapshot()).wait()
    expect(await dToken.getCurrentSnapshotId()).to.be.equal(1)
    await dToken.mint(_tester.address, 5)
    expect(await dToken.balanceOfAt(_tester.address, 1)).to.eq(1)
  })

  it('Burns by burner', async function () {
    await dToken.grantRole(ethers.utils.id('MINTER_ROLE'), _deployer.address)
    await dToken.mint(_tester2.address, ethers.utils.parseEther('100'))

    await dToken.grantRole(ethers.utils.id('BURNER_ROLE'), _tester.address)

    await expect(
      dToken.burnByBurner(_tester2.address, ethers.utils.parseEther('50.1'))
    ).to.be.revertedWith('missing role')
    await dToken
      .connect(_tester)
      .burnByBurner(_tester2.address, ethers.utils.parseEther('50.1'))
    await dToken
      .connect(_tester)
      .burnByBurner(_tester2.address, ethers.utils.parseEther('0.2'))

    expect(await dToken.balanceOf(_tester2.address)).to.be.equal(
      ethers.utils.parseEther('49.7')
    )

    expect(await dToken.totalBurnedByBurner()).to.eq(
      ethers.utils.parseEther('50.3')
    )
  })
})
