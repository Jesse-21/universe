const MarketplaceV1 = require("./abi/marketplace-v1.json");
const MarketplaceV1Proxy = require("./abi/marketplace-v1-proxy.json");

const dev = () => {
  return {
    WETH_ADDRESS: "0x32307adfFE088e383AFAa721b06436aDaBA47DBE",
    FID_MARKETPLACE_V1_ADDRESS: "0x8d881b939ceb6070a9368aa6d91bc42e30697da9",
    FID_MARKETPLACE_PROXY_V1_ABI: MarketplaceV1Proxy.abi,
    FID_MARKETPLACE_V1_ABI: MarketplaceV1.abi,
    FID_ADDRESS: "0x43Be7849F724E7CA7D56BDeCeCb277adb99b8A83",
    CHAIN_ID: 420,
    NODE_URL: process.env.OPT_GOERLI_API_KEY,
    NODE_NETWORK: "opt-goerli",
  };
};

const prod = () => {
  return {
    WETH_ADDRESS: "0x4200000000000000000000000000000000000006",
    FID_MARKETPLACE_PROXY_V1_ABI: MarketplaceV1Proxy.abi,
    FID_MARKETPLACE_V1_ABI: MarketplaceV1.abi,
    FID_ADDRESS: "0x00000000fcaf86937e41ba038b4fa40baa4b780a",
    CHAIN_ID: 10,
    NODE_URL: process.env.OPTIMISM_NODE_URL,
    NODE_NETWORK: "opt-mainnet",
  };
};

const config = process.env.NODE_ENV === "production" ? prod : dev;
module.exports = { config, prod, dev };
