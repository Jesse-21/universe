const { ethers } = require("ethers");
const axios = require("axios").default;

const { Farcaster } = require("../../models/Identities/Farcaster");

const { getProvider } = require("../../helpers/alchemy-provider");
const {
  abi: farcasterRegistryAbi,
} = require("../../helpers/abi/farcaster_registry_rinkeby_abi.js");

const AlchemyProvider = getProvider({
  network: "rinkeby",
  node: "",
});

/**
 * WARNING: This service is V1 AND not DEPRECATED AND BROKEN,
 * it's just a reference for the future
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 */
class FarcasterService {
  constructor({ registryAddress } = {}) {
    this.registryContract = new ethers.Contract(
      registryAddress || "0xe3Be01D99bAa8dB9905b33a3cA391238234B79D1",
      farcasterRegistryAbi,
      AlchemyProvider
    );
  }

  async _getTotalUsernames() {
    const len = await this.registryContract.usernamesLength();
    return len;
  }

  async _getUsernameByIndex(index) {
    const username = await this.registryContract.usernameAtIndex(index);
    return username;
  }

  async _decodeByte32Username(usernameByte32) {
    const username = ethers.utils.parseBytes32String(`${usernameByte32}`);
    return username;
  }

  async _getDirectoryUrl(username) {
    const directoryUrl = await this.registryContract.getDirectoryUrl(username);
    return directoryUrl;
  }

  async _getDirectoryJson(directoryUrl) {
    const { data } = await axios.get(directoryUrl, { timeout: 2500 });
    return data;
  }

  async _getProofJson(proofUrl) {
    const { data } = await axios.get(proofUrl, { timeout: 2500 });
    return data;
  }

  async _updateOrCreateForAccount(
    account,
    { directoryUrl, avatarUrl, username, displayName, farcasterAddress }
  ) {
    const farcaster = await Farcaster.findById(account?.identities?.farcaster);
    if (!farcaster)
      return Farcaster.create({
        account,
        directoryUrl,
        avatarUrl,
        username,
        displayName,
        farcasterAddress,
      });

    farcaster.directoryUrl = directoryUrl;
    farcaster.avatarUrl = avatarUrl;
    farcaster.username = username;
    farcaster.displayName = displayName;
    farcaster.farcasterAddress = farcasterAddress;
    await farcaster.save();
    return farcaster;
  }
}

module.exports = { Service: FarcasterService };
