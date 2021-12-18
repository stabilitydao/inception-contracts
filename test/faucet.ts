import {assert,expect} from 'chai'
import { ethers, waffle } from "hardhat"
import chai from 'chai';
import { solidity } from "ethereum-waffle";
chai.use(solidity);
describe("Faucet unit test", () => {
    let faucet;
    before(async () => {
        const Faucet = await ethers.getContractFactory('Faucet')
        faucet = await Faucet.deploy({
            value: ethers.utils.parseUnits("10", "ether"),
        })
    })
    beforeEach(async () => {
        await faucet.deployed()
    })
    it("Is contract deployed succesfully?", async () => {
        let address = faucet.address
        expect(address).to.be.not.undefined;
        expect(address).to.be.not.null;
    })
    it("it should set the owner to be the deployer of the contract", async () => {
        let [signer] = await ethers.provider.listAccounts();
        expect(signer).to.be.not.undefined;
        expect(signer).to.be.not.null;
        expect(await faucet.owner()).to.equal(signer)
    })
    it("getBalance returns right initial balance of contract", async () => {
        expect((await faucet.getBalance()).toString()).to.equal(ethers.utils.parseUnits("10", "ether").toString())
    })
    it("Getting balance is sum of all and initial balance", async () => {
        await faucet.fallback({ value: ethers.utils.parseUnits("10", "ether"), })
        assert.equal((await faucet.getBalance()).toString(), ethers.utils.parseUnits("20", "ether").toString());
    })

    // Toggle it according to your conditions -giveMe Condition Eth- in contract before testing 
    //  -giveMe Condition Eth- =>   msg.sender.balance <= 10000 ether
    // it("It should revert when balance is more than -giveMe Condition Eth- ether", async () => {
    //     await expect(faucet.giveMe()).to.be.reverted;
    // })

    it("We should get o.1 eth when balance is less than -giveMe Condition Eth- ether", async () => {
        let [signer] = await ethers.provider.listAccounts();
        const provider = waffle.provider;
        const beforebalanceOfsignerInWei = await provider.getBalance(signer)
        const beforebalanceOfsignerInEth = ethers.utils.formatEther(beforebalanceOfsignerInWei.toString())
        await faucet.giveMe()
        const afterbalanceOfsignerInWei = await provider.getBalance(signer)
        const afterbalanceOfsignerInEth = ethers.utils.formatEther(afterbalanceOfsignerInWei.toString())
        assert(beforebalanceOfsignerInEth < afterbalanceOfsignerInEth)
    })
    it("It should revert if we will ask for faucet under 24 hours", async () => {
        //Deploying again 
        const Faucet = await ethers.getContractFactory('Faucet')
        faucet = await Faucet.deploy({
            value: ethers.utils.parseUnits("10", "ether"),
        })
        await faucet.deployed()
        await faucet.giveMe()
        await expect(faucet.giveMe()).to.be.reverted;
    })
    it("Should destroy faucet", async () => {
        await faucet.destroyFaucet()
        await expect(faucet.getBalance()).to.be.reverted;
    })
})