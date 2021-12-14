import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { DividendToken__factory, DividendToken } from '../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('DividendToken', function () {
  let dToken: DividendToken
  let _deployer: SignerWithAddress
  let _tester: SignerWithAddress

  beforeEach(async function () {
    const [deployer, tester] = await ethers.getSigners()

    _deployer = deployer
    _tester = tester

    const dTokenFactory = (await ethers.getContractFactory(
      'DividendToken',
      deployer
    )) as DividendToken__factory

    dToken = (await upgrades.deployProxy(dTokenFactory, {
      kind: 'uups',
    })) as DividendToken

    await dToken.deployed()
  })

  it('Metadata', async function () {
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
})
