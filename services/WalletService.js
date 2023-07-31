const constants = require("./constants/aa");
const ethers = require("ethers");

class WalletService {
  // constructor({ apiKey, chain = "opt-goerli" }) {
  //   this.apiKey = apiKey;
  //   this.chain = chain;
  //   if (this.chain === "homestead") {
  //     this.chain = "mainnet";
  //   }
  // }

  getInitCode({
    ownerAddress, // the address that will be the owner of deployed Account contract
    factoryContractAddress = constants.factoryContractAddress,
    salt = 1,
  }) {
    if (!ownerAddress) {
      throw new Error("ownerAddress is required");
    }
    const iface = new ethers.utils.Interface(constants.FactoryContractJson.abi);

    let factoryAddress = ethers.utils.hexZeroPad(factoryContractAddress, 20); // pad to 20 bytes
    let functionCalldata = iface.encodeFunctionData("createAccount", [
      ownerAddress,
      salt,
    ]);

    let initCode = ethers.utils.hexConcat([factoryAddress, functionCalldata]);

    return initCode;
  }
}

module.exports = { Service: WalletService };
