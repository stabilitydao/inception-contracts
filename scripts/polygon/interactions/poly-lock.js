require('dotenv').config();
const Web3 = require('web3');
const BridgePoly = require('../../../deployments/mumbai/Bridge.json');
const profitToken = require('../../../deployments/mumbai/ProfitToken.json');

async function main() {
  // url to polygon node (websocket)
  const web3Poly = new Web3(`wss://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
  const senderPrivKey = process.env.SENDER_PRIV_KEY;
  const { address: sender } = web3Poly.eth.accounts.wallet.add(senderPrivKey);
  const adminPrivKey = process.env.ADMIN_PRIV_KEY;
  const { address: admin } = web3Poly.eth.accounts.wallet.add(adminPrivKey);
  
  const bridgePoly = new web3Poly.eth.Contract(
    BridgePoly.abi,
    BridgePoly.address
  );
  const tokenPoly = new web3Poly.eth.Contract(
    profitToken.abi,
    profitToken.address
  );
  const amount = "2000000000000000000"; // 2 tokens

  const polyTokenAddr = "0x108aBca337e88a9fc1DE96b0ec323f476b35cD44";
  const hecoTokenAddr = "0xd4E98976761f7f6B5A9b21581822192f58C9A420";
  const extraArgs = ["Stability", "PROFIT", 18, hecoTokenAddr, 60];

  const tx = await bridgePoly.methods.addToken(polyTokenAddr, extraArgs);
  const [gasPrice, gasCost] = await Promise.all([
    web3Poly.eth.getGasPrice(),
    tx.estimateGas({from: admin}),
  ]);
  const data = tx.encodeABI();
  const txData = {
    from: admin,
    to: bridgePoly.options.address,
    gas: gasCost,
    gasPrice: gasPrice,
    data: data
  };
  const addRes = await web3Poly.eth.sendTransaction(txData);
  console.log(`AddToken Successful: https://mumbai.polygonscan.com/tx/${addRes.transactionHash}`);

  const tx2 = await tokenPoly.methods.approve(bridgePoly.options.address, amount);
  const [gasPrice2, gasCost2] = await Promise.all([
    web3Poly.eth.getGasPrice(),
    tx2.estimateGas({from: sender}),
  ]);
  const data2 = tx2.encodeABI();
  const txData2 = {
    from: sender,
    to: tokenPoly.options.address,
    gas: gasCost2,
    gasPrice: gasPrice2,
    data: data2
  };
  const approveRes = await web3Poly.eth.sendTransaction(txData2);
  console.log(`Approve Successful: https://mumbai.polygonscan.com/tx/${approveRes.transactionHash}`);

  const tx3 = await bridgePoly.methods.lockToken(tokenPoly.options.address, sender, amount);
  const [gasPrice3, gasCost3] = await Promise.all([
    web3Poly.eth.getGasPrice(),
    tx3.estimateGas({from: sender}),
  ]);
  const data3 = tx3.encodeABI();
  const txData3 = {
    from: sender,
    to: bridgePoly.options.address,
    gas: gasCost3,
    gasPrice: gasPrice3,
    data: data3
  };
  const lockRes = await web3Poly.eth.sendTransaction(txData3);
  console.log(`Lock Successful: https://mumbai.polygonscan.com/tx/${lockRes.transactionHash}`);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
