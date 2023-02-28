const { ethers } = require("ethers");

const getProvider = ({ network, node }) => {
  if (node) {
    return new ethers.providers.AlchemyProvider(network || "homestead", node);
  }
  return ethers.getDefaultProvider(network || "homestead");
};

module.exports = {
  getProvider,
};
