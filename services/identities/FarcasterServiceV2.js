const axios = require("axios").default;

class FarcasterServiceV2 {
  /**
   * clean up API profile to our farcaster schema
   * at schemas/identities/farcaster.js */
  _cleanProfile(profile = {}) {
    return {
      _id: profile.id,
      avatarUrl: profile.avatarUrl,
      username: profile.username,
      displayName: profile.displayName,
      farcasterAddress: profile.address, // profile.address is not the same as connectedAddress!
      bio: profile.bio,
      followers: profile.followers,
      following: profile.following,
    };
  }
  async getProfileByAddress(address) {
    try {
      const { data: apiCallData } = await axios.get(
        "https://searchcaster.xyz/api/profiles",
        {
          params: {
            connected_address: address,
          },
          timeout: 5000,
        }
      );

      const farcaster = apiCallData?.[0]?.body;
      if (!farcaster) return null;
      return { ...this._cleanProfile(farcaster), address };
    } catch (e) {
      return false;
    }
  }
  async getProfileByUsername(username) {
    try {
      const { data: apiCallData } = await axios.get(
        "https://searchcaster.xyz/api/profiles",
        {
          params: {
            username,
          },
          timeout: 5000,
        }
      );

      const farcaster = apiCallData?.[0]?.body;
      if (!farcaster) return null;
      return {
        ...this._cleanProfile(farcaster),
        address: apiCallData?.[0]?.connectedAddress,
      };
    } catch (e) {
      return false;
    }
  }
}

module.exports = { Service: FarcasterServiceV2 };
