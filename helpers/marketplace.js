const MarketplaceV1 = require("./abi/marketplace-v1.json");
const MarketplaceV1Proxy = require("./abi/marketplace-v1-proxy.json");
const { abi: idRegistrarAbi } = require("../helpers/abi/id-registrar");

const dev = () => {
  return {
    WETH_ADDRESS: "0x32307adfFE088e383AFAa721b06436aDaBA47DBE",
    FID_MARKETPLACE_V1_ADDRESS: "0x438f57a99778ebc79d4e74a12812eda54ed09422",
    FID_MARKETPLACE_PROXY_V1_ABI: MarketplaceV1Proxy.abi,
    FID_MARKETPLACE_V1_ABI: MarketplaceV1.abi,
    FID_ADDRESS: "0x43Be7849F724E7CA7D56BDeCeCb277adb99b8A83",
    CHAIN_ID: 420,
    NODE_URL: process.env.OPT_GOERLI_API_KEY,
    NODE_NETWORK: 420,
    ID_REGISTRY_ABI: idRegistrarAbi,
    ID_REGISTRY_ADDRESS: "0x43Be7849F724E7CA7D56BDeCeCb277adb99b8A83",
    /** Farcaster v2 */
    ID_REGISTRY_ADDRESS_2: "0x00000000fc6c5f01fc30151999387bb99a9f489b",
    ID_GATEWAY_ADDRESS: "0x00000000fc25870c6ed6b6c7e41fb078b7656f69",
    USE_GATEWAYS: true,
  };
};

const prod = () => {
  return {
    WETH_ADDRESS: "0x4200000000000000000000000000000000000006",
    FID_MARKETPLACE_PROXY_V1_ABI: MarketplaceV1Proxy.abi,
    FID_MARKETPLACE_V1_ADDRESS: "0x57ce6c12a101c41e790744413f4f5408ac64d8c6",
    FID_MARKETPLACE_V1_ABI: MarketplaceV1.abi,
    FID_ADDRESS: "0x00000000fcaf86937e41ba038b4fa40baa4b780a",
    CHAIN_ID: 10,
    NODE_URL: process.env.OPTIMISM_NODE_URL,
    NODE_NETWORK: 10,
    ID_REGISTRY_ABI: idRegistrarAbi,
    ID_REGISTRY_ADDRESS: "0x00000000fcaf86937e41ba038b4fa40baa4b780a",
    /** Farcaster v2 */
    ID_REGISTRY_ADDRESS_2: "0x00000000fc6c5f01fc30151999387bb99a9f489b",
    ID_GATEWAY_ADDRESS: "0x00000000fc25870c6ed6b6c7e41fb078b7656f69",
    USE_GATEWAYS: false,
  };
};

// const config = process.env.NODE_ENV === "production" ? prod : dev;
const config = prod;
module.exports = { config, prod, dev };
