const hre = require("hardhat");

async function main() {
  const Faucet = await hre.ethers.getContractFactory("Faucet");
  const initialAmount = '10'
  const faucet = await Faucet.deploy({value: ethers.utils.parseUnits(initialAmount, "ether"),});
  await faucet.deployed();
  console.log("Faucet Contract deployed to:", faucet.address);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
