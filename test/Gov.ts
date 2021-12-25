import { expect } from 'chai'
import { artifacts, waffle, ethers, upgrades } from 'hardhat'
import {
  ProfitToken,
  Gov,
  Gov__factory,
  GovTimelock,
  XGov__factory,
  XGov,
} from '../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('Gov', function () {
  let token: ProfitToken
  let gov: Gov
  let timelock: GovTimelock
  let _deployer: SignerWithAddress
  let _devFund: SignerWithAddress
  let _tester: SignerWithAddress
  const timelockDelay = 100
  const votingDelay = 10
  const votingPeriod = 30
  const proposalThreshold = ethers.utils.parseEther('10')

  beforeEach(async function () {
    const [deployer, tester, devFund] = await ethers.getSigners()

    _deployer = deployer
    _tester = tester
    _devFund = devFund

    // deploy ERC20Votes token and timelock controller
    token = <ProfitToken>(
      await waffle.deployContract(
        _deployer,
        await artifacts.readArtifact('ProfitToken'),
        [_devFund.address]
      )
    )
    await token.deployed()

    timelock = <GovTimelock>(
      await waffle.deployContract(
        _deployer,
        await artifacts.readArtifact('GovTimelock'),
        [10, [], []]
      )
    )
    await timelock.deployed()

    // deploy timelocked governance
    const govFactory = (await ethers.getContractFactory(
      'Gov',
      deployer
    )) as Gov__factory

    gov = (await upgrades.deployProxy(
      govFactory,
      [
        token.address,
        timelock.address,
        votingDelay,
        votingPeriod,
        proposalThreshold,
      ],
      {
        kind: 'uups',
      }
    )) as Gov

    await gov.deployed()

    // grant timelock proposer and executor roles to governance
    await timelock.grantRole(ethers.utils.id('PROPOSER_ROLE'), gov.address)
    await timelock.grantRole(ethers.utils.id('EXECUTOR_ROLE'), gov.address)
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
    expect(await gov.proposalThreshold()).to.eq(proposalThreshold)
    expect(await gov.votingDelay()).to.eq(votingDelay)
    expect(await gov.votingPeriod()).to.eq(votingPeriod)
    expect(
      await gov.quorum((await ethers.provider.getBlockNumber()) - 1)
    ).to.eq(ethers.utils.parseEther('1000')) // 1000e18

    expect(
      await gov.supportsInterface(ethers.utils.hexlify([1, 3, 4, 5]))
    ).to.eq(false)
  })

  it('Transfer tokens from treasure', async function () {
    // transfer 100000.0 tokens from governance treasure to address
    const grantAmount = ethers.utils.parseEther('100000')
    const proposalDesc = 'Proposal #1: Give grant to team'
    await token.connect(_devFund).transfer(timelock.address, grantAmount)
    await token
      .connect(_devFund)
      .transfer(_tester.address, ethers.utils.parseEther('10000'))
    await token
      .connect(_devFund)
      .transfer(_deployer.address, ethers.utils.parseEther('9.999'))
    await token.connect(_tester).delegate(_tester.address)
    await token.connect(_deployer).delegate(_deployer.address)

    // https://docs.openzeppelin.com/contracts/4.x/governance
    const calldata = token.interface.encodeFunctionData('transfer', [
      _deployer.address,
      grantAmount,
    ])

    await expect(
      gov.propose([token.address], [0], [calldata], proposalDesc)
    ).to.be.revertedWith(
      'GovernorCompatibilityBravo: proposer votes below proposal threshold'
    )

    await expect(
      gov
        .connect(_tester)
        .propose([token.address], [0], [calldata], proposalDesc)
    ).to.be.not.reverted

    const proposalId = await gov.hashProposal(
      [token.address],
      [0],
      [calldata],
      ethers.utils.id(proposalDesc)
    )

    // text internal _cancel method just for coverage
    // gov.x_cancel()

    // proposal in Pending state
    expect(await gov.state(proposalId)).to.eq(0)

    // cant cast vote while pending
    await expect(gov.castVote(proposalId, 0)).to.be.revertedWith(
      'Governor: vote not currently active'
    )

    // mine 100 blocks
    for (let i = 0; i < votingDelay; i++) {
      await ethers.provider.send('evm_mine', [])
    }

    // proposal in Active state
    expect(await gov.state(proposalId)).to.eq(1)

    // cast vote
    await expect(gov.connect(_tester).castVote(proposalId, 1)).to.be.not
      .reverted

    // mine blocks
    for (let i = 0; i < votingPeriod; i++) {
      await ethers.provider.send('evm_mine', [])
    }

    // proposal in Succeed state
    expect(await gov.state(proposalId)).to.eq(4)

    // queue proposal to timelock
    await expect(
      gov.queue([token.address], [0], [calldata], ethers.utils.id(proposalDesc))
    ).to.not.be.reverted

    // proposal in Queued state
    expect(await gov.state(proposalId)).to.eq(5)

    // try to execute
    await expect(
      gov.execute(
        [token.address],
        [0],
        [calldata],
        ethers.utils.id(proposalDesc)
      )
    ).to.be.revertedWith('TimelockController: operation is not ready')

    // mine blocks
    for (let i = 0; i < timelockDelay; i++) {
      await ethers.provider.send('evm_mine', [])
    }

    // execute proposal
    await expect(
      gov.execute(
        [token.address],
        [0],
        [calldata],
        ethers.utils.id(proposalDesc)
      )
    ).to.not.be.reverted

    // proposal in Executed state
    expect(await gov.state(proposalId)).to.eq(7)

    await ethers.provider.send('evm_mine', [])

    expect(await token.balanceOf(_deployer.address)).to.eq(
      ethers.utils.parseEther('100009.999')
    )
  })

  it('Change governance settings', async function () {
    // change proposal threshold
    const newProposalThreshold = ethers.utils.parseEther('20')
    const proposalDesc = 'Proposal #2: change proposal threshold'
    await token
      .connect(_devFund)
      .transfer(_tester.address, ethers.utils.parseEther('10000'))
    await token.connect(_tester).delegate(_tester.address)

    const calldata = gov.interface.encodeFunctionData('setProposalThreshold', [
      newProposalThreshold,
    ])

    await expect(
      gov.connect(_tester).propose([gov.address], [0], [calldata], proposalDesc)
    ).to.be.not.reverted

    const proposalId = await gov.hashProposal(
      [gov.address],
      [0],
      [calldata],
      ethers.utils.id(proposalDesc)
    )

    // proposal in Pending state
    expect(await gov.state(proposalId)).to.eq(0)

    // cant cast vote while pending
    await expect(gov.castVote(proposalId, 0)).to.be.revertedWith(
      'Governor: vote not currently active'
    )

    // mine 100 blocks
    for (let i = 0; i < votingDelay; i++) {
      await ethers.provider.send('evm_mine', [])
    }

    // proposal in Active state
    expect(await gov.state(proposalId)).to.eq(1)

    // cast vote
    await expect(gov.connect(_tester).castVote(proposalId, 1)).to.be.not
      .reverted

    // mine blocks
    for (let i = 0; i < votingPeriod; i++) {
      await ethers.provider.send('evm_mine', [])
    }

    // proposal in Succeed state
    expect(await gov.state(proposalId)).to.eq(4)

    // queue proposal to timelock
    await expect(
      gov.queue([gov.address], [0], [calldata], ethers.utils.id(proposalDesc))
    ).to.not.be.reverted

    // mine blocks
    for (let i = 0; i < timelockDelay; i++) {
      await ethers.provider.send('evm_mine', [])
    }

    // execute proposal
    await expect(
      gov.execute([gov.address], [0], [calldata], ethers.utils.id(proposalDesc))
    ).to.not.be.reverted

    // proposal in Executed state
    expect(await gov.state(proposalId)).to.eq(7)

    await ethers.provider.send('evm_mine', [])

    expect(await gov.proposalThreshold()).to.eq(newProposalThreshold)
  })

  it('Internal cancel method is ok', async function () {
    //
    const newProposalThreshold = ethers.utils.parseEther('20')
    const proposalDesc = 'xGov test proposal'
    await token
      .connect(_devFund)
      .transfer(_tester.address, ethers.utils.parseEther('10000'))
    await token.connect(_tester).delegate(_tester.address)

    // deploy xGov
    const xGovFactory = (await ethers.getContractFactory(
      'XGov',
      _deployer
    )) as XGov__factory

    const xGov = (await upgrades.deployProxy(
      xGovFactory,
      [
        token.address,
        timelock.address,
        votingDelay,
        votingPeriod,
        proposalThreshold,
      ],
      {
        kind: 'uups',
      }
    )) as XGov

    await xGov.deployed()

    const calldata = xGov.interface.encodeFunctionData('setProposalThreshold', [
      newProposalThreshold,
    ])

    await expect(
      xGov
        .connect(_tester)
        .propose([xGov.address], [0], [calldata], proposalDesc)
    ).to.be.not.reverted

    const proposalId = await xGov.hashProposal(
      [xGov.address],
      [0],
      [calldata],
      ethers.utils.id(proposalDesc)
    )

    // proposal in Pending state
    expect(await xGov.state(proposalId)).to.eq(0)

    await expect(
      xGov.x_cancel(
        [xGov.address],
        [0],
        [calldata],
        ethers.utils.id(proposalDesc)
      )
    ).to.be.not.reverted
  })
})
