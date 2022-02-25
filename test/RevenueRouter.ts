import { artifacts, waffle, ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import {
  DividendToken, ERC20Mock,
  ProfitPayer, ProfitToken, RevenueRouter,
  Splitter,
  StabilityDAO, V3SwapRouter,
  WETH9,
} from '../typechain-types'
import {id, parseEther} from "ethers/lib/utils";

describe('RevenueRouter', function () {
  let router: RevenueRouter
  let profit: ProfitToken
  let splitter: Splitter
  let wEth: WETH9
  let usd: ERC20Mock
  let timelock: StabilityDAO
  let pPayer: ProfitPayer
  let dToken: DividendToken
  let v3Router: V3SwapRouter
  let _deployer: SignerWithAddress
  let _devFund: SignerWithAddress
  let _tester: SignerWithAddress

  beforeEach(async function () {
    const [deployer, tester, devFund] = await ethers.getSigners()

    _deployer = deployer
    _tester = tester
    _devFund = devFund

    timelock = <StabilityDAO>(
      await waffle.deployContract(
        _deployer,
        await artifacts.readArtifact('StabilityDAO'),
        [10, [], []]
      )
    )
    await timelock.deployed()

    splitter = (await upgrades.deployProxy(
        (await ethers.getContractFactory(
            'Splitter',
            _deployer
        )),
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

    usd = await (await ethers.getContractFactory('ERC20Mock')).deploy()
    await usd.deployed()

    dToken = (await upgrades.deployProxy(
        (await ethers.getContractFactory(
            'DividendToken',
            _deployer
        )),
        {
          kind: 'uups',
        }
    )) as DividendToken
    await dToken.deployed()

    profit = await (await ethers.getContractFactory('ProfitToken')).deploy(devFund.address)
    await profit.deployed()

    pPayer = (await upgrades.deployProxy(
        (await ethers.getContractFactory(
            'ProfitPayer',
            _deployer
        )),
      [dToken.address, profit.address],
      {
        kind: 'uups',
      }
    )) as ProfitPayer

    await pPayer.deployed()

    v3Router = await (await ethers.getContractFactory('V3SwapRouter')).deploy()
    await v3Router.deployed()

    router = await (await ethers.getContractFactory('RevenueRouter')).deploy(
        profit.address,
        wEth.address,
        10000,
        v3Router.address,
        splitter.address,
        pPayer.address
    )
    await router.deployed()
  })

  it('Swap by V3 mock', async function () {
    await dToken.grantRole(id('SNAPSHOT_ROLE'), pPayer.address)
    await dToken.grantRole(ethers.utils.id('MINTER_ROLE'), _deployer.address)
    await dToken.mint(_tester.address, parseEther('1'))
    await dToken.mint(_deployer.address, parseEther('1'))
    await splitter.grantRole(ethers.utils.id('EXECUTOR_ROLE'), router.address)

    await usd.transfer(router.address, parseEther('1'))
    await router.addV3Route(
        usd.address,
        wEth.address,
        3000,
        0
    )

    // because V3 is mock, need to send PROFIT to splitter by hands
    await profit.connect(_devFund).transfer(splitter.address, parseEther('10'))

    await router.run()

    // 30% of splitted 10 PROFIT  == 3 PROFIT on treasure
    expect(await profit.balanceOf(timelock.address)).to.eq(parseEther('3'))

    // 40% splitted to ProfitPayer with 2 SDIV holders
    expect(await pPayer.paymentPending(_tester.address)).to.eq(parseEther('2'))
  })

})
