const { ethers } = require("ethers");

async function isDeployedContract(address, { network, apiKey }) {
  // Initialize Alchemy provider with your API key
  const provider = new ethers.providers.AlchemyProvider(network, apiKey);

  // Get the contract code at the given address
  const code = await provider.getCode(address);

  // Check if the code exists
  return code !== "0x";
}

module.exports = { isDeployedContract };
