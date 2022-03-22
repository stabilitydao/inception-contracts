require('dotenv').config();
const Web3 = require('web3');
const BridgePoly = require('../../../deployments/mumbai/Bridge.json');
const BridgeHECO = require('../../../deployments/hecoTestnet/Bridge.json');

// url to polygon node (websocket)
// const web3Poly = new Web3(`wss://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);

// url to polygon node (https)
const web3Poly = new Web3(`https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);

// url to heco node (websocket)
const web3Heco = new Web3("wss://ws-testnet.hecochain.com");

// url to heco node (https)
// const web3Heco = new Web3("https://http-testnet.hecochain.com");

const adminPrivKey = process.env.ADMIN_PRIV_KEY;
const { address: admin } = web3Poly.eth.accounts.wallet.add(adminPrivKey);

const bridgePoly = new web3Poly.eth.Contract(
  BridgePoly.abi,
  BridgePoly.address
);

const bridgeHECO = new web3Heco.eth.Contract(
  BridgeHECO.abi,
  BridgeHECO.address
);

bridgeHECO.events.TokenBurn({
  filter: {burnt: true}
})
.on('data', async function(event) {
  const { token, sender, recipient, amount, date, nonce } = event.returnValues;
  console.log("Destination token:", token);

  try{
    const tx = bridgePoly.methods.unlockToken(token, sender, recipient, amount);
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
    const receipt = await web3Poly.eth.sendTransaction(txData);
    console.log(`Transaction hash: https://mumbai.polygonscan.com/tx/${receipt.transactionHash}`);
    console.log(`
      Processed transfer:
      - token ${token}
      - from ${sender} 
      - to ${recipient} 
      - amount ${web3Poly.utils.fromWei(amount, 'ether')} tokens
      - date ${date}
      - nonce ${nonce}
    `);
  } catch (error) {
    console.error(error);
  }
});
