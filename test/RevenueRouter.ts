import { artifacts, waffle, ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import {
  DividendToken,
  ERC20Mock,
  ERC20Mock__factory,
  ProfitPayer,
  ProfitToken,
  RevenueRouter,
  RevenueRouter__factory,
  Splitter,
  StabilityDAO,
  UniswapV2RouterMock,
  UniswapV2RouterMock__factory,
  UniswapV3FactoryMock,
  UniswapV3FactoryMock__factory,
  UniswapV3RouterMock,
  UniswapV3RouterMock__factory,
  USD6Mock,
  USD6Mock__factory,
  WETH9,
} from '../typechain-types'
import { id, parseEther } from 'ethers/lib/utils'

describe('RevenueRouter', function () {
  let router: RevenueRouter
  let profit: ProfitToken
  let splitter: Splitter
  let wEth: WETH9
  let dummyERC20: ERC20Mock
  let usdc: USD6Mock
  let timelock: StabilityDAO
  let pPayer: ProfitPayer
  let dToken: DividendToken
  let v3Router: UniswapV3RouterMock
  let v2Router: UniswapV2RouterMock
  let v3Factory: UniswapV3FactoryMock
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
      await ethers.getContractFactory('Splitter', _deployer),
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

    dummyERC20 = await (<ERC20Mock__factory>(
      await ethers.getContractFactory('ERC20Mock')
    )).deploy()
    await dummyERC20.deployed()

    usdc = await (<USD6Mock__factory>(
      await ethers.getContractFactory('USD6Mock')
    )).deploy()
    await usdc.deployed()

    dToken = (await upgrades.deployProxy(
      await ethers.getContractFactory('DividendToken', _deployer),
      {
        kind: 'uups',
      }
    )) as DividendToken
    await dToken.deployed()

    profit = await (
      await ethers.getContractFactory('ProfitToken')
    ).deploy(devFund.address)
    await profit.deployed()

    pPayer = (await upgrades.deployProxy(
      await ethers.getContractFactory('ProfitPayer', _deployer),
      [dToken.address, profit.address],
      {
        kind: 'uups',
      }
    )) as ProfitPayer

    await pPayer.deployed()

    v3Router = await (<UniswapV3RouterMock__factory>(
      await ethers.getContractFactory('UniswapV3RouterMock')
    )).deploy()
    await v3Router.deployed()

    v2Router = await (<UniswapV2RouterMock__factory>(
      await ethers.getContractFactory('UniswapV2RouterMock')
    )).deploy()
    await v2Router.deployed()

    v3Factory = await (<UniswapV3FactoryMock__factory>(
      await ethers.getContractFactory('UniswapV3FactoryMock')
    )).deploy()
    await v3Factory.deployed()

    router = await (<RevenueRouter__factory>(
      await ethers.getContractFactory('RevenueRouter')
    )).deploy(
      profit.address,
      wEth.address,
      10000,
      v3Router.address,
      splitter.address,
      pPayer.address,
      v3Factory.address
    )
    await router.deployed()

    await (await v3Factory.createPool(profit.address, wEth.address, 10000)).wait()
    await (await v3Factory.createPool(dummyERC20.address, wEth.address, 3000)).wait()
    await (await v3Factory.createPool(usdc.address, dummyERC20.address, 3000)).wait()
  })

  it('Run', async function () {
    await dToken.grantRole(id('SNAPSHOT_ROLE'), pPayer.address)
    await dToken.grantRole(ethers.utils.id('MINTER_ROLE'), _deployer.address)
    await dToken.mint(_tester.address, parseEther('1'))
    await dToken.mint(_deployer.address, parseEther('1'))
    await splitter.grantRole(ethers.utils.id('EXECUTOR_ROLE'), router.address)

    await dummyERC20.transfer(router.address, parseEther('1'))
    await usdc.transfer(router.address, 100000000)

    await router.addV3Route(dummyERC20.address, wEth.address, 3000, 10000)
    await router.addDirectRoute(usdc.address, _devFund.address)

    // because V3 is mock, need to send PROFIT to splitter by hands
    await profit.connect(_devFund).transfer(splitter.address, parseEther('4'))

    expect(await router.estimateProfit()).to.gt(1000000000)

    await expect(router.run())
      .to.emit(router, 'ProfitGeneration')
      .withArgs(parseEther('4')) // 2 x2 virtual v3 mock swaps

    // deactivate route
    await expect(
      router.updateV3Route(0, dummyERC20.address, wEth.address, 3000, 0, false)
    )

    await usdc.transfer(router.address, 100000000)

    await expect(router.run())
      .to.emit(router, 'Send')
      .withArgs(usdc.address, _devFund.address, 100000000)

    expect(await usdc.balanceOf(_devFund.address)).to.eq(200000000)
    expect(await usdc.balanceOf(router.address)).to.eq(0)

    // 30% of splitted 4 PROFIT == 1.2 PROFIT on treasure
    expect(await profit.balanceOf(timelock.address)).to.eq(parseEther('1.2'))
    // 40% splitted to ProfitPayer with 2 SDIV holders
    expect(await pPayer.paymentPending(_tester.address)).to.eq(
      parseEther('0.8')
    )

    // v2 routes
    await dummyERC20.transfer(router.address, parseEther('1'))
    await router.addV2Route(
      dummyERC20.address,
      usdc.address,
      v2Router.address,
      true
    )

    // because V2 is mock, need to send PROFIT to splitter by hands
    await profit.connect(_devFund).transfer(splitter.address, parseEther('36'))

    await expect(router.run())
      .to.emit(router, 'ProfitGeneration')
      .withArgs(parseEther('36')) // (1 + 1) * 3 * 3 * 2

    await router.updateDirectRoute(0, usdc.address, _devFund.address, false)
    await router.updateV2Route(
      0,
      dummyERC20.address,
      usdc.address,
      v2Router.address,
      true,
      false
    )
    await router.addV3Route(usdc.address, dummyERC20.address, 3000, 3000)

    // because V2 and V3 are mocks, need to send PROFIT to splitter by hands
    await profit.connect(_devFund).transfer(splitter.address, parseEther('8'))
    await usdc.transfer(router.address, 100000000) // 100.0 usdc

    // why?
    await expect(router.run())
      .to.emit(router, 'ProfitGeneration')
      .withArgs(parseEther('12.0000000008')) // 100 * 2 * 2 * 2

    // because V2 is mock, need to send PROFIT to splitter by hands
    await profit.connect(_devFund).transfer(splitter.address, parseEther('36'))
    await router.updateV2Route(
      0,
      dummyERC20.address,
      usdc.address,
      v2Router.address,
      false,
      false
    )

    await expect(router.run())
      .to.emit(router, 'ProfitGeneration')
      .withArgs(800000000) // 100 * 2 * 2 * 2

    expect(await router.totalDirectRoutes()).to.eq(1)
    await router.deleteDirectRoute(0)
    await router.deleteV2Route(0)
    await router.deleteV3Route(1)
    expect(await router.totalDirectRoutes()).to.eq(0)
    expect(await router.totalV2Routes()).to.eq(0)
    expect(await router.totalV3Routes()).to.eq(1)

    await router.withdrawERC20(usdc.address, _tester.address, 555)
    expect(await usdc.balanceOf(_tester.address)).to.eq(555)
  })

  it('More tests', async function () {
    await dToken.grantRole(id('SNAPSHOT_ROLE'), pPayer.address)
    await dToken.grantRole(ethers.utils.id('MINTER_ROLE'), _deployer.address)
    await dToken.mint(_tester.address, parseEther('1'))
    await splitter.grantRole(ethers.utils.id('EXECUTOR_ROLE'), router.address)

    await dummyERC20.transfer(router.address, parseEther('1'))
    await usdc.transfer(router.address, 100)
    await router.addV2Route(
      dummyERC20.address,
      usdc.address,
      v2Router.address,
      true
    )
    await router.addV3Route(usdc.address, dummyERC20.address, 3000, 3000)
    await profit.connect(_devFund).transfer(splitter.address, parseEther('36'))
    await expect(router.run())
      .to.emit(router, 'ProfitGeneration')
      .withArgs(parseEther('18.0000000000000008'))
  })

  it('Withdraws ETH From RevenueRouter', async function () {
    await _deployer.sendTransaction({
      to: router.address,
      value: parseEther('3'),
    })
    await router.withdrawETH(_tester.address, parseEther('1'))
    const routerEthBal = await ethers.provider.getBalance(router.address)
    await expect(routerEthBal == parseEther('2'))
  })
})
