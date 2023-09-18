const axios = require("axios").default;

const {
  getFarcasterUserByUsername,
  getFarcasterUserByConnectedAddress,
  getFarcasterUserByFid,
  getConnectedAddressForFid,
} = require("../../helpers/farcaster");

class FarcasterServiceV2 {
  /**
   * clean up API profile to our farcaster schema
   * at schemas/identities/farcaster.js */
  _cleanProfile(profile = {}) {
    return {
      _id: parseInt(profile.fid),
      username: profile.username,
      displayName: profile.displayName,
      farcasterAddress: profile.custodyAddress, // profile.address is not the same as connectedAddress!
      followers: profile.followerCount,
      following: profile.followingCount,
      registeredAt: profile.registeredAt,
      bio: profile.bio?.text,
      external: profile.external,
    };
  }
  async getProfileByAddress(address) {
    let farcaster = await getFarcasterUserByConnectedAddress(address);
    if (!farcaster) {
      farcaster = await getFarcasterUserByFid(address);
    }
    if (!farcaster) return null;
    return { ...this._cleanProfile(farcaster), address };
  }
  async getProfileByUsername(username) {
    const farcaster = await getFarcasterUserByUsername(username);
    if (!farcaster) return null;
    const address = await getConnectedAddressForFid(farcaster.fid);
    return {
      ...this._cleanProfile(farcaster),
      address,
    };
  }
}

module.exports = { Service: FarcasterServiceV2 };
