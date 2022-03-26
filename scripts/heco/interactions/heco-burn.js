require('dotenv').config();
const Web3 = require('web3');
const BridgeHECO = require('../../../deployments/hecoTestnet/Bridge.json');
const SynthProfit = require('../../../deployments/hecoTestnet/Profit.json');

async function main() {
  // url to heco node
  const web3Heco = new Web3(`https://http-testnet.hecochain.com`);
  const senderPrivKey = process.env.SENDER_PRIV_KEY;
  const { address: sender } = web3Heco.eth.accounts.wallet.add(senderPrivKey);
  const adminPrivKey = process.env.ADMIN_PRIV_KEY;
  const { address: admin } = web3Heco.eth.accounts.wallet.add(adminPrivKey);

  const bridgeHECO = new web3Heco.eth.Contract(
    BridgeHECO.abi,
    BridgeHECO.address
  );
  const synthProfit = new web3Heco.eth.Contract(
    SynthProfit.abi,
    SynthProfit.address
  );
  const amount = "1500000000000000000"; // 1.5 tokens

  const polyTokenAddr = "0x108aBca337e88a9fc1DE96b0ec323f476b35cD44";
  const hecoTokenAddr = "0xd4E98976761f7f6B5A9b21581822192f58C9A420";
  const extraArgs = ["Stability", "PROFIT", 18, polyTokenAddr, 60];

  const tx = await bridgeHECO.methods.addToken(hecoTokenAddr, extraArgs);
  const [gasPrice, gasCost] = await Promise.all([
    web3Heco.eth.getGasPrice(),
    tx.estimateGas({from: admin}),
  ]);
  const data = tx.encodeABI();
  const txData = {
    from: admin,
    to: bridgeHECO.options.address,
    gas: gasCost,
    gasPrice: gasPrice,
    data: data
  };
  const addRes = await web3Heco.eth.sendTransaction(txData);
  console.log(`AddToken Successful: https://testnet.ftmscan.com/tx/${addRes.transactionHash}`);

  const tx2 = await synthProfit.methods.approve(bridgeHECO.options.address, amount);
  const [gasPrice2, gasCost2] = await Promise.all([
    web3Heco.eth.getGasPrice(),
    tx2.estimateGas({from: sender}),
  ]);
  const data2 = tx2.encodeABI();
  const txData2 = {
    from: sender,
    to: synthProfit.options.address,
    gas: gasCost2,
    gasPrice: gasPrice2,
    data: data2
  };
  const approveRes = await web3Heco.eth.sendTransaction(txData2);
  console.log(`Approve Successful: https://testnet.ftmscan.com/tx/${approveRes.transactionHash}`);

  const tx3 = await bridgeHECO.methods.burn(synthProfit.options.address, sender, amount);
  const [gasPrice3, gasCost3] = await Promise.all([
    web3Heco.eth.getGasPrice(),
    tx3.estimateGas({from: sender}),
  ]);
  const data3 = tx3.encodeABI();
  const txData3 = {
    from: sender,
    to: bridgeHECO.options.address,
    gas: gasCost3,
    gasPrice: gasPrice3,
    data: data3
  };
  const burnRes = await web3Heco.eth.sendTransaction(txData3);
  console.log(`Burn Successful: https://testnet.ftmscan.com/tx/${burnRes.transactionHash}`);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
