const { ethers } = require("ethers");

const getProvider = ({ network, node }) => {
  const finalNetwork = network === "opt-mainnet" ? "optimism" : network;
  if (node) {
    return new ethers.providers.AlchemyProvider(
      finalNetwork || "homestead",
      node
    );
  }
  return ethers.getDefaultProvider(finalNetwork || "homestead");
};

module.exports = {
  getProvider,
};
