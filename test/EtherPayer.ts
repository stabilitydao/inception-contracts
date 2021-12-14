import { expect } from 'chai'
import { artifacts, waffle, ethers, upgrades } from 'hardhat'
import {
  DividendToken__factory,
  DividendToken,
  EtherPayer,
  EtherPayer__factory,
  WETH9,
} from '../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('EtherPayer', function () {
  let dToken: DividendToken
  let wEth: WETH9
  let ePayer: EtherPayer
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

    wEth = <WETH9>(
      await waffle.deployContract(
        _deployer,
        await artifacts.readArtifact('WETH9')
      )
    )
    await wEth.deployed()

    const ePayerFactory = (await ethers.getContractFactory(
      'EtherPayer',
      deployer
    )) as EtherPayer__factory

    ePayer = (await upgrades.deployProxy(
      ePayerFactory,
      [dToken.address, wEth.address],
      {
        kind: 'uups',
      }
    )) as EtherPayer

    await ePayer.deployed()
    await dToken.grantRole(ethers.utils.id('SNAPSHOT_ROLE'), ePayer.address)
    await dToken.grantRole(ethers.utils.id('MINTER_ROLE'), _deployer.address)
    await dToken.mint(_tester.address, 10)
    await wEth.approve(_deployer.address, 10)
    await wEth.deposit({ value: 5, from: _deployer.address })
  })

  it('Pays', async function () {
    await wEth.approve(ePayer.address, 2)
    await ePayer.receivePayment(_deployer.address, 2)
    await ePayer.connect(_tester).releasePayment()
    expect(await wEth.balanceOf(_tester.address)).to.eq(2)
  })
})
