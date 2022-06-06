import { expect } from 'chai'
import { artifacts, waffle, ethers, upgrades } from 'hardhat'
import {
  MetaRouter,
  ProfitMaker,
  ProfitMaker__factory,
  ProfitToken,
  UniswapV2RouterMock,
  UniswapV2RouterMock__factory,
  USD6Mock,
  USD6Mock__factory,
  WETH9,
  WETH9__factory,
} from '../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { parseEther } from 'ethers/lib/utils'

describe('MetaRouter', function () {
  let wNative: WETH9
  let metaRouter: MetaRouter
  let v2Router: UniswapV2RouterMock
  let usdc: USD6Mock
  let profitMaker: ProfitMaker
  let profitToken: ProfitToken
  let _deployer: SignerWithAddress
  let _tester: SignerWithAddress

  beforeEach(async function () {
    const [deployer, tester] = await ethers.getSigners()
    _deployer = deployer
    _tester = tester

    wNative = <WETH9>(
      await waffle.deployContract(
        _deployer,
        await artifacts.readArtifact('WETH9')
      )
    )
    await wNative.deployed()

    metaRouter = (await upgrades.deployProxy(
      await ethers.getContractFactory('MetaRouter', _deployer),
      [_tester.address, 50],
      {
        kind: 'uups',
      }
    )) as MetaRouter
    await metaRouter.deployed()

    v2Router = await (<UniswapV2RouterMock__factory>(
      await ethers.getContractFactory('UniswapV2RouterMock')
    )).deploy()
    await v2Router.deployed()

    usdc = await (<USD6Mock__factory>(
      await ethers.getContractFactory('USD6Mock')
    )).deploy()
    await usdc.deployed()
  })

  it('Swap NATIVE to WNATIVE', async function () {
    await metaRouter.grantRole(ethers.utils.id('ROUTER_ROLE'), wNative.address)
    let wNativeABI = WETH9__factory.abi
    let wNativeiface = new ethers.utils.Interface(wNativeABI)
    let callData = wNativeiface.encodeFunctionData('deposit')

    await metaRouter.swap(
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      wNative.address,
      ethers.utils.parseEther('1'),
      wNative.address,
      callData,
      {
        value: ethers.utils.parseEther('1'),
      }
    )

    expect(await wNative.balanceOf(_deployer.address)).to.eq(
      ethers.utils.parseEther('0.995')
    )
    expect(await wNative.balanceOf(_tester.address)).to.eq(
      ethers.utils.parseEther('0.005')
    )
  })

  it('Swap WNATIVE to NATIVE', async function () {
    await metaRouter.grantRole(ethers.utils.id('ROUTER_ROLE'), wNative.address)
    await wNative.deposit({ value: ethers.utils.parseEther('1') })
    expect(await wNative.balanceOf(_deployer.address)).to.eq(
      ethers.utils.parseEther('1')
    )

    await wNative.approve(metaRouter.address, ethers.utils.parseEther('1'))

    let wNativeABI = WETH9__factory.abi
    let wNativeiface = new ethers.utils.Interface(wNativeABI)
    let callData = wNativeiface.encodeFunctionData('withdraw', [
      ethers.utils.parseEther('1'),
    ])

    // tester - fee receiver
    const testerBalanceBefore = await _tester.getBalance()

    await metaRouter.swap(
      wNative.address,
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      ethers.utils.parseEther('1'),
      wNative.address,
      callData
    )

    expect(await _tester.getBalance()).to.eq(
      ethers.utils.parseEther('0.005').add(testerBalanceBefore)
    )
  })

  it('Swap token to token through DeX router mock', async function () {
    await metaRouter.grantRole(ethers.utils.id('ROUTER_ROLE'), v2Router.address)
    await wNative.deposit({ value: ethers.utils.parseEther('1') })
    await wNative.approve(metaRouter.address, ethers.utils.parseEther('1'))

    const dexRouterInterface = new ethers.utils.Interface(
      UniswapV2RouterMock__factory.abi
    )
    const callData = dexRouterInterface.encodeFunctionData(
      'swapExactTokensForTokens',
      [
        ethers.utils.parseEther('1'),
        0,
        [wNative.address, usdc.address],
        metaRouter.address,
        0,
      ]
    )

    // because V2 is mock, need to fill it with out tokens
    await usdc.transfer(v2Router.address, parseEther('3'))

    const balanceBefore = await usdc.balanceOf(_deployer.address)

    await metaRouter.swap(
      wNative.address,
      usdc.address,
      ethers.utils.parseEther('1'),
      v2Router.address,
      callData
    )

    // 3 * 0.995
    expect(await usdc.balanceOf(_deployer.address)).to.eq(
      ethers.utils.parseEther('2.985').add(balanceBefore)
    )
    expect(await usdc.balanceOf(_tester.address)).to.eq(
      ethers.utils.parseEther('0.015')
    )
  })

  it('Use no fee NFT', async function () {
    await metaRouter.grantRole(
      ethers.utils.id('UPGRADER_ROLE'),
      _deployer.address
    )

    // deploy and mint PM NFT
    profitToken = await (
      await ethers.getContractFactory('ProfitToken')
    ).deploy(_deployer.address)
    await profitToken.deployed()
    profitMaker = <ProfitMaker>(
      await upgrades.deployProxy(
        <ProfitMaker__factory>await ethers.getContractFactory('ProfitMaker'),
        [profitToken.address],
        { kind: 'uups' }
      )
    )
    await profitMaker.deployed()
    const now = (
      await ethers.provider.getBlock(await ethers.provider.getBlockNumber())
    ).timestamp
    await profitMaker.setMintState(now, now + 86400, 3)
    await profitToken.approve(
      profitMaker.address,
      ethers.utils.parseEther('10000')
    )
    await profitMaker.safeMint(_deployer.address, 10)
    expect(await profitMaker.balanceOf(_deployer.address)).to.equal(1)

    await metaRouter.setup(
      _deployer.address,
      150,
      '0x0000000000000000000000000000000000000000'
    )
    await metaRouter.setup(_tester.address, 50, profitMaker.address)
    await metaRouter.grantRole(ethers.utils.id('ROUTER_ROLE'), v2Router.address)
    await wNative.deposit({ value: ethers.utils.parseEther('1') })
    await wNative.approve(metaRouter.address, ethers.utils.parseEther('1'))
    const dexRouterInterface = new ethers.utils.Interface(
      UniswapV2RouterMock__factory.abi
    )
    const callData = dexRouterInterface.encodeFunctionData(
      'swapExactTokensForTokens',
      [
        ethers.utils.parseEther('1'),
        0,
        [wNative.address, usdc.address],
        metaRouter.address,
        0,
      ]
    )

    // because V2 is mock, need to fill it with out tokens
    await usdc.transfer(v2Router.address, parseEther('3'))

    const balanceBefore = await usdc.balanceOf(_deployer.address)

    await metaRouter.swap(
      wNative.address,
      usdc.address,
      ethers.utils.parseEther('1'),
      v2Router.address,
      callData
    )

    // 3 * 0.995
    expect(await usdc.balanceOf(_deployer.address)).to.eq(
      ethers.utils.parseEther('3').add(balanceBefore)
    )
    expect(await usdc.balanceOf(_tester.address)).to.eq(0)
  })
})
