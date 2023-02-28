const chainTable = { 1: "Ethereum mainnet" };

const mapChainIdToName = (chainId) => {
  return chainTable[chainId];
};

module.exports = { chainTable, mapChainIdToName };