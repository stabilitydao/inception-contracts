import { assert, expect } from 'chai'
import { ethers, upgrades, waffle } from 'hardhat'
import { Faucet, Faucet__factory } from '../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
describe('Faucet unit test', () => {
  let faucet: Faucet

  let _deployer: SignerWithAddress
  let _tester: SignerWithAddress

  before(async () => {
    const [deployer, tester] = await ethers.getSigners()
    _deployer = deployer
    _tester = tester
  })

  beforeEach(async () => {
    const faucetFactory = (await ethers.getContractFactory(
      'Faucet',
      _deployer
    )) as Faucet__factory

    faucet = (await upgrades.deployProxy(faucetFactory, {
      kind: 'uups',
    })) as Faucet

    await faucet.deployed()
  })
  it('it should set the owner to be the deployer of the contract', async () => {
    let [signer] = await ethers.provider.listAccounts()
    expect(signer).to.be.not.undefined
    expect(signer).to.be.not.null
    expect(await faucet.owner()).to.equal(signer)
  })

  it('Upgrades', async function () {
    const faucetFactory = (await ethers.getContractFactory(
      'Faucet',
      _deployer
    )) as Faucet__factory

    faucet = (await upgrades.upgradeProxy(
      faucet.address,
      faucetFactory
    )) as Faucet

    await faucet.deployed()
  })

  it('Give eth', async () => {
    let [signer] = await ethers.provider.listAccounts()
    const tx = await _deployer.sendTransaction({
      from: _deployer.address,
      to: faucet.address,
      value: ethers.utils.parseEther('10.0'),
    })
    await tx.wait()
    const provider = waffle.provider
    const beforebalanceOfsignerInWei = await provider.getBalance(signer)
    await expect(faucet.giveEther()).to.be.not.reverted
    const afterbalanceOfsignerInWei = await provider.getBalance(signer)
    assert(beforebalanceOfsignerInWei < afterbalanceOfsignerInWei)
    await expect(faucet.giveEther()).to.be.revertedWith(
      'You have taken recently'
    )
  })

  it('Change amount', async () => {
    expect(await faucet.amount()).to.eq(ethers.utils.parseEther('1'))
    await expect(faucet.changeAmount(ethers.utils.parseEther('2'))).to.not.be
      .reverted
    expect(await faucet.amount()).to.eq(ethers.utils.parseEther('2'))
    await expect(
      faucet.connect(_tester).changeAmount(ethers.utils.parseEther('3'))
    ).to.be.reverted
  })
})
