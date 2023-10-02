const constants = require("../../services/constants/aa");

const prod = () => {
  //
  return {
    API_KEY: process.env.OPT_GOERLI_API_KEY,
    DEFAULT_URI: "http://localhost:8080/graphql",
    NODE_NETWORK: "opt-goerli",
    CHAIN_ID: 420,
    FACTORY_CONTRACT_ADDRESS: constants.factoryContractAddress,
    FACTORY_ABI: constants.FactoryContractJson.abi,
  };
};
const dev = () => {
  return {
    API_KEY: process.env.OPT_GOERLI_API_KEY,
    DEFAULT_URI: "https://protocol.wield.co/graphql",
    NODE_NETWORK: "opt-goerli",
    CHAIN_ID: 420,
    FACTORY_CONTRACT_ADDRESS: constants.factoryContractAddress,
    FACTORY_ABI: constants.FactoryContractJson.abi,
  };
};

const config = process.env.NODE_ENV === "production" ? prod : dev;
module.exports = { config, prod, dev };
