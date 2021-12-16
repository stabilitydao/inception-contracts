import { expect } from 'chai'
import { artifacts, waffle, ethers, upgrades } from 'hardhat'
import { ProfitToken, Gov, Gov__factory } from '../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('Gov', function () {
  let token: ProfitToken
  let gov: Gov
  let _deployer: SignerWithAddress
  let _devFund: SignerWithAddress
  let _tester: SignerWithAddress

  beforeEach(async function () {
    const [deployer, tester, devFund] = await ethers.getSigners()

    _deployer = deployer
    _tester = tester
    _devFund = devFund

    token = <ProfitToken>(
      await waffle.deployContract(
        _deployer,
        await artifacts.readArtifact('ProfitToken'),
        [_devFund.address]
      )
    )
    await token.deployed()

    const govFactory = (await ethers.getContractFactory(
      'Gov',
      deployer
    )) as Gov__factory

    gov = (await upgrades.deployProxy(govFactory, [token.address], {
      kind: 'uups',
    })) as Gov

    await gov.deployed()
  })

  it('Upgrades', async function () {
    const govFactory = (await ethers.getContractFactory(
      'Gov',
      _deployer
    )) as Gov__factory

    gov = (await upgrades.upgradeProxy(gov.address, govFactory)) as Gov

    await gov.deployed()
  })

  it('Deployed', async function () {
    expect(await gov.name()).to.eq('Gov')
    expect(await gov.version()).to.eq('1')
    expect(await gov.proposalThreshold()).to.eq(0)
    expect(await gov.votingDelay()).to.eq(100)
  })

  it('Working', async function () {
    await token.connect(_devFund).transfer(gov.address, 1000)
    await token.connect(_devFund).transfer(_tester.address, 10)
    await token.connect(_devFund).transfer(_deployer.address, 5)
    await token.connect(_tester).delegate(_tester.address)
    await token.connect(_deployer).delegate(_deployer.address)

    // transfer 100 tokens from governance treasure to devFund
    // https://docs.openzeppelin.com/contracts/4.x/governance
    const grantAmount = 100
    const transferCalldata = token.interface.encodeFunctionData('transfer', [
      _devFund.address,
      grantAmount,
    ])
    await gov.propose(
      [token.address],
      [0],
      [transferCalldata],
      'Proposal #1: Give grant to team'
    )

    await gov.quorum((await ethers.provider.getBlockNumber()) - 1)

    // todo write some tests
  })
})
