const constants = require("./constants/aa");
const ethers = require("ethers");

class WalletService {
  constructor({ apiKey, chain = "opt-goerli", chainId = 420 }) {
    this.apiKey = apiKey;
    this.chain = chain;
    this.chainId = chainId;
    if (this.chain === "homestead") {
      this.chain = "mainnet";
    }
  }

  async getBackpackNonce(backpackAddress) {
    const accountAbi = constants.AccountContractJson.abi;
    const provider = new ethers.providers.AlchemyProvider(
      this.chainId,
      this.apiKey
    );

    const accountContract = new ethers.Contract(
      backpackAddress,
      accountAbi,
      provider
    );
    const nonce = await accountContract.getNonce();

    return nonce;
  }

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

  getCallData({ abi, functionName, value = 0, contractAddress, params = [] }) {
    if (!abi) {
      throw new Error("abi is required");
    }
    if (!contractAddress) {
      throw new Error("contractAddress is required");
    }
    const iface = new ethers.utils.Interface(abi);

    let functionCalldata = iface.encodeFunctionData(functionName, [...params]);

    const accountAbi = constants.AccountContractJson.abi;
    const accountInterface = new ethers.utils.Interface(accountAbi);

    const executeCallData = accountInterface.encodeFunctionData("execute", [
      contractAddress,
      value,
      functionCalldata,
    ]);

    return executeCallData;
  }
}

module.exports = { Service: WalletService };
