// All on Goerli
const FactoryContractJson = require("../../helpers/abi/beb-account-factory-0.json");

/** Factory & Entry Point */
// version 0 / SimpleAccountFactory.sol

// on OP testnet
// https://goerli-optimism.etherscan.io/address/0xaf8aab777c6f972187fdb6ea10ebcc12f72aca9c
const factoryContractAddress = "0xaF8Aab777c6F972187fDB6EA10EbCc12f72ACa9c";
const entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
/** */

/** Paymaster */
const defaultPaymasterPolicyId = "1e412f13-51f2-4767-a066-5f4efac884ae";
// signature from signing an initCode
const defaultPaymasterDummySignature =
  "0x659d588947d8efeffde4641f1d9ee753946309f2ec443de2311216fce8efd26173515e4543970213e040107a4e977dc44845693b6454a63fbe232d78ced9df181b";

/** TestNet NFTs */
// https://goerli-optimism.etherscan.io/address/0x2d0A208d7409976A2e68b1470e66770406D8f260
const bebOnboardingLootContractAddress =
  "0x2d0A208d7409976A2e68b1470e66770406D8f260";

module.exports = {
  FactoryContractJson,
  factoryContractAddress,
  entryPointAddress,
  defaultPaymasterPolicyId,
  bebOnboardingLootContractAddress,
  // useful to estimate gas
  defaultPaymasterDummySignature,
};
