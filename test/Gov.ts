import { expect } from 'chai'
import { artifacts, waffle, ethers, upgrades } from 'hardhat'
import {
  ProfitToken,
  Gov,
  Gov__factory,
  ERC721VotesMock,
  ERC20VotesMock,
  Treasure,
} from '../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('Gov', function () {
  let govNft: ERC721VotesMock
  let token: ProfitToken
  let gov: Gov
  let timelock: Treasure
  let _deployer: SignerWithAddress
  let _devFund: SignerWithAddress
  let _tester: SignerWithAddress
  const timelockDelay = 100
  const votingDelay = 10
  const votingPeriod = 30
  const proposalThreshold = ethers.utils.parseEther('10')
  const quorum = 1
  const lateQuorumBlocks = 10

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

    timelock = <Treasure>(
      await waffle.deployContract(
        _deployer,
        await artifacts.readArtifact('Treasure'),
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
        quorum,
        lateQuorumBlocks,
      ],
      {
        kind: 'uups',
      }
    )) as Gov

    await gov.deployed()

    // grant timelock proposer and executor roles to governance
    await timelock.grantRole(ethers.utils.id('PROPOSER_ROLE'), gov.address)
    await timelock.grantRole(ethers.utils.id('EXECUTOR_ROLE'), gov.address)

    govNft = <ERC721VotesMock>(
      await waffle.deployContract(
        _deployer,
        await artifacts.readArtifact('ERC721VotesMock'),
        ['Dummy NFT', 'DNFT']
      )
    )
    await govNft.deployed()
  })

  it('Upgrades', async function () {
    await gov.grantRole(ethers.utils.id('UPGRADER_ROLE'), _deployer.address)

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
    ).to.eq(ethers.utils.parseEther('10000')) // 10000e18

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

  it('Change proposal threshold', async function () {
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

  it('Cancel bad proposal', async function () {
    const proposalDesc = 'Bad proposal'
    await token
      .connect(_devFund)
      .transfer(_tester.address, ethers.utils.parseEther('10000'))
    await token.connect(_tester).delegate(_tester.address)

    const calldata = token.interface.encodeFunctionData('transfer', [
      _deployer.address,
      ethers.utils.parseEther('9000000'),
    ])

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

    // proposal in Pending state
    expect(await gov.state(proposalId)).to.eq(0)

    await expect(
      gov.cancel(
        [token.address],
        [0],
        [calldata],
        ethers.utils.id(proposalDesc)
      )
    ).to.be.revertedWith('is missing role')

    await gov.grantRole(ethers.utils.id('MODERATOR_ROLE'), _devFund.address)

    await expect(
      gov
        .connect(_devFund)
        .cancel([token.address], [0], [calldata], ethers.utils.id(proposalDesc))
    ).to.not.be.reverted

    // proposal is canlcelled
    expect(await gov.state(proposalId)).to.eq(2)
  })

  it('Change quorum', async function () {
    // change quorum numerator
    const newQuorumNumerator = 10
    const proposalDesc = 'Proposal #3: change quorum numerator'
    await token
      .connect(_devFund)
      .transfer(_tester.address, ethers.utils.parseEther('10000'))
    await token.connect(_tester).delegate(_tester.address)

    const calldata = gov.interface.encodeFunctionData('updateQuorumNumerator', [
      newQuorumNumerator,
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

    // mine blocks
    for (let i = 0; i <= votingDelay; i++) {
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

    expect(await gov.quorumNumerator()).to.eq(newQuorumNumerator)
  })

  it('NFT voting', async function () {
    await expect(gov.addNFT(govNft.address, 1)).to.be.revertedWith(
      'is missing role'
    )
    await gov.grantRole(
      ethers.utils.id('POWER_CHANGER_ROLE'),
      _deployer.address
    )

    // PROFIT token multiplier: 1000
    // NFT with multiplier 10 * 1000 * 10**18: 10 PROFIT has same voting power as 1 NFT
    await gov.addNFT(govNft.address, ethers.utils.parseEther('10000'))

    await govNft.mint(_deployer.address, 1)
    expect(await govNft.balanceOf(_deployer.address)).to.eq(1)
    await govNft.delegate(_deployer.address)
    expect(
      await gov.getVotes(
        _deployer.address,
        (await ethers.provider.getBlockNumber()) - 1
      )
    ).to.eq(0)

    const newQuorumNumerator = 10
    const proposalDesc = 'Proposal #3: change quorum numerator'
    const calldata = gov.interface.encodeFunctionData('updateQuorumNumerator', [
      newQuorumNumerator,
    ])
    await expect(gov.propose([gov.address], [0], [calldata], proposalDesc)).to
      .be.not.reverted

    // votes must be 10 * 10**18
    expect(
      await gov.getVotes(
        _deployer.address,
        (await ethers.provider.getBlockNumber()) - 1
      )
    ).to.eq(ethers.utils.parseEther('10'))
  })

  it('Voting power management', async function () {
    const ft = <ERC20VotesMock>(
      await waffle.deployContract(
        _deployer,
        await artifacts.readArtifact('ERC20VotesMock')
      )
    )
    await ft.deployed()
    expect(await ft.symbol()).to.eq('MTK')
    await gov.grantRole(
      ethers.utils.id('POWER_CHANGER_ROLE'),
      _deployer.address
    )

    await gov.addFT(ft.address, 200)

    await ft.transfer(_tester.address, ethers.utils.parseEther('5'))

    await token.connect(_tester).delegate(_tester.address)
    await ft.connect(_tester).delegate(_tester.address)
    await govNft.connect(_tester).delegate(_tester.address)

    // make random transfer of tokens to update snapshot
    await ft.transfer(_devFund.address, 1)

    expect(
      await gov.getVotes(
        _tester.address,
        (await ethers.provider.getBlockNumber()) - 1
      )
    ).to.eq(ethers.utils.parseEther('1'))

    await gov.setFTMultiplier(1, 1000)

    expect(
      await gov.getVotes(
        _tester.address,
        (await ethers.provider.getBlockNumber()) - 1
      )
    ).to.eq(ethers.utils.parseEther('5'))

    // proposal threshold == 10 * 10**18
    // voting power of _tester == 5 * 10**18
    await token
      .connect(_devFund)
      .transfer(timelock.address, ethers.utils.parseEther('100000'))
    await expect(
      gov
        .connect(_tester)
        .propose(
          [token.address],
          [0],
          [
            token.interface.encodeFunctionData('transfer', [
              _deployer.address,
              ethers.utils.parseEther('100000'),
            ]),
          ],
          'Proposal #1: Give grant to team'
        )
    ).to.be.revertedWith(
      'GovernorCompatibilityBravo: proposer votes below proposal threshold'
    )

    await token
      .connect(_devFund)
      .transfer(_tester.address, ethers.utils.parseEther('3'))

    // random transfer
    await token
      .connect(_devFund)
      .transfer(_deployer.address, ethers.utils.parseEther('1'))

    expect(
      await gov.getVotes(
        _tester.address,
        (await ethers.provider.getBlockNumber()) - 1
      )
    ).to.eq(ethers.utils.parseEther('8'))

    await gov.addNFT(govNft.address, ethers.utils.parseEther('500'))
    await govNft.mint(_tester.address, 1)
    await govNft.mint(_tester.address, 2)

    // random mint
    await govNft.mint(_deployer.address, 3)

    expect(
      await gov.getVotes(
        _tester.address,
        (await ethers.provider.getBlockNumber()) - 1
      )
    ).to.eq(ethers.utils.parseEther('9'))

    await gov.setNFTMultiplier(0, ethers.utils.parseEther('1000'))

    expect(
      await gov.getVotes(
        _tester.address,
        (await ethers.provider.getBlockNumber()) - 1
      )
    ).to.eq(ethers.utils.parseEther('10'))

    await expect(
      gov
        .connect(_tester)
        .propose(
          [token.address],
          [0],
          [
            token.interface.encodeFunctionData('transfer', [
              _deployer.address,
              ethers.utils.parseEther('100000'),
            ]),
          ],
          'Proposal #1: Give grant to team'
        )
    ).to.be.not.reverted

    // (1000000+1000000+3)×0,01 * 10**18
    expect(
      await gov.quorum((await ethers.provider.getBlockNumber()) - 1)
    ).to.eq('20000030000000000000000')
  })

  it('Prevent late quorum', async function () {
    // change prevent late quorum extension and test it
    const newLateQuorumExtension = 100
    const proposalDesc = 'Proposal #10: change late quorum extension'
    await token
      .connect(_devFund)
      .transfer(_tester.address, ethers.utils.parseEther('10000'))
    await token.connect(_tester).delegate(_tester.address)

    const calldata = gov.interface.encodeFunctionData(
      'setLateQuorumVoteExtension',
      [newLateQuorumExtension]
    )

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

    // mine blocks
    for (let i = 0; i < votingPeriod - 2; i++) {
      await ethers.provider.send('evm_mine', [])
    }

    // cast vote
    await expect(gov.connect(_tester).castVote(proposalId, 1)).to.be.not
      .reverted

    for (let i = 0; i < 5; i++) {
      await ethers.provider.send('evm_mine', [])
    }

    // proposal in Active state
    expect(await gov.state(proposalId)).to.eq(1)

    for (let i = 0; i < lateQuorumBlocks - 4; i++) {
      await ethers.provider.send('evm_mine', [])
    }

    // extended voting period was extended
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

    expect(await gov.lateQuorumVoteExtension()).to.eq(newLateQuorumExtension)
  })
})
