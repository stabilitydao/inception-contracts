import { expect } from 'chai'
import { artifacts, waffle, ethers, upgrades } from 'hardhat'
import {
  ProfitToken,
  Gov,
  Gov__factory,
  ERC721VotesMock,
  ERC1155Mock,
  StabilityDAO,
} from '../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('Treasure', function () {
  let govNft: ERC721VotesMock
  let erc1155: ERC1155Mock
  let token: ProfitToken
  let gov: Gov
  let timelock: StabilityDAO
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

    timelock = <StabilityDAO>(
      await waffle.deployContract(
        _deployer,
        await artifacts.readArtifact('StabilityDAO'),
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

    erc1155 = <ERC1155Mock>(
      await waffle.deployContract(
        _deployer,
        await artifacts.readArtifact('ERC1155Mock'),
        ['https://uri']
      )
    )
    await erc1155.deployed()
  })

  it('Timelocked governance deployed', async function () {
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

    expect(
      await timelock.supportsInterface(ethers.utils.hexlify([1, 3, 4, 5]))
    ).to.eq(false)
  })

  it('Transfer NFT to and from treasure', async function () {
    await govNft.mint(_deployer.address, 1)
    expect(await govNft.balanceOf(_deployer.address)).to.eq(1)
    await expect(
      govNft['safeTransferFrom(address,address,uint256)'](
        _deployer.address,
        timelock.address,
        1
      )
    ).to.be.not.reverted
    expect(await govNft.balanceOf(timelock.address)).to.eq(1)
    expect(await govNft.ownerOf(1)).to.eq(timelock.address)

    await erc1155.mint(_deployer.address, 1, 10, [])
    expect(await erc1155.balanceOf(_deployer.address, 1)).to.eq(10)
    await expect(
      erc1155['safeTransferFrom'](
        _deployer.address,
        timelock.address,
        1,
        10,
        []
      )
    ).to.be.not.reverted
    expect(await erc1155.balanceOf(timelock.address, 1)).to.eq(10)

    await erc1155.mint(_deployer.address, 2, 5, [])
    await erc1155.mint(_deployer.address, 3, 15, [])
    await expect(
      erc1155['safeBatchTransferFrom'](
        _deployer.address,
        timelock.address,
        [2, 3],
        [3, 6],
        []
      )
    ).to.be.not.reverted

    await token.connect(_devFund).delegate(_devFund.address)

    const proposalDesc = 'Proposal #1: Send NFT from to tester'
    const calldata = govNft.interface.encodeFunctionData('transferFrom', [
      timelock.address,
      _tester.address,
      1,
    ])

    await expect(
      gov
        .connect(_devFund)
        .propose([govNft.address], [0], [calldata], proposalDesc)
    ).to.be.not.reverted

    const proposalId = await gov.hashProposal(
      [govNft.address],
      [0],
      [calldata],
      ethers.utils.id(proposalDesc)
    )

    // mine 100 blocks
    for (let i = 0; i < votingDelay + 1; i++) {
      await ethers.provider.send('evm_mine', [])
    }

    // proposal in Active state
    expect(await gov.state(proposalId)).to.eq(1)

    // cast vote
    await expect(gov.connect(_devFund).castVote(proposalId, 1)).to.be.not
      .reverted

    // mine blocks
    for (let i = 0; i < votingPeriod; i++) {
      await ethers.provider.send('evm_mine', [])
    }

    // queue proposal to timelock
    await expect(
      gov
        .connect(_tester)
        .queue([govNft.address], [0], [calldata], ethers.utils.id(proposalDesc))
    ).to.not.be.reverted

    // proposal in Queued state
    expect(await gov.state(proposalId)).to.eq(5)

    // try to execute
    await expect(
      gov.execute(
        [govNft.address],
        [0],
        [calldata],
        ethers.utils.id(proposalDesc)
      )
    ).to.be.revertedWith('TimelockController: operation is not ready')

    // mine blocks
    for (let i = 0; i < timelockDelay + 2; i++) {
      await ethers.provider.send('evm_mine', [])
    }

    // execute proposal
    await expect(
      gov.execute(
        [govNft.address],
        [0],
        [calldata],
        ethers.utils.id(proposalDesc)
      )
    ).to.be.not.reverted

    // proposal in Executed state
    expect(await gov.state(proposalId)).to.eq(7)

    await ethers.provider.send('evm_mine', [])

    expect(await govNft.balanceOf(_tester.address)).to.eq(1)
  })
})
