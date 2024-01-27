const { MockProvider } = require("ethereum-waffle");
const provider = new MockProvider();
let wallet;
[wallet] = provider.getWallets();

const getSignedMessage = async (nonce) => {
  const msg = `@wieldlabs/universe wants you to sign in with your Ethereum account, secured with a signed message:\n ${nonce.length} ${nonce}`;

  const message = await wallet.signMessage(msg);
  return {
    message,
    address: wallet.address,
  };
};

module.exports = {
  getSignedMessage,
  wallet,
};
