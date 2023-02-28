const BebRegistryBetaController = require("./abi/beb-controller-abi.json");
const BebRegistrar = require("./abi/beb-registrar-abi.json");

const dev = () => {
  return {
    NODE_URL: process.env.GOERLI_NODE_URL,
    NODE_NETWORK: "goerli",
    BETA_CONTROLLER_ADDRESS: "0x78c3a1380842b82Da7b60e83C50b2e4cFA2D98Ee",
    REGISTRAR_ADDRESS: "0xC8d8c87E05E0Fd4C62b50D31bfA9f826AAb5c001",
    PRICE_ORACLE_ADDRESS: "0xAc20A90F71EFcB606232d640476E6aB30b426251",
    BETA_CONTROLLER_ABI: BebRegistryBetaController.abi,
    REGISTRAR_ABI: BebRegistrar.abi,
  };
};

const prod = () => {
  return {
    NODE_URL: process.env.HOMESTEAD_NODE_URL,
    NODE_NETWORK: "homestead",
    BETA_CONTROLLER_ADDRESS: "0x0F08FC2A63F4BfcDDfDa5c38e9896220d5468a64",
    REGISTRAR_ADDRESS: "0x427b8efEe2d6453Bb1c59849F164C867e4b2B376",
    PRICE_ORACLE_ADDRESS: "0x8d881B939cEb6070a9368Aa6D91bc42e30697Da9",
    BETA_CONTROLLER_ABI: BebRegistryBetaController.abi,
    REGISTRAR_ABI: BebRegistrar.abi,
  };
};

const config = process.env.NODE_ENV === "production" ? prod : dev;
module.exports = { config, prod, dev };
