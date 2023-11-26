const axios = require("axios").default;

const {
  getFarcasterUserByUsername,
  getFarcasterUserByConnectedAddress,
  getFidByCustodyAddress,
  getFarcasterUserByFid,
  getConnectedAddressForFid,
} = require("../../helpers/farcaster");

class FarcasterServiceV2 {
  /**
   * clean up API profile to our farcaster schema
   * at schemas/identities/farcaster.js */
  _cleanProfile(profile = {}) {
    return {
      _id: profile.fid,
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
  async getProfilesByAddress(addressRaw) {
    const address = addressRaw?.toLowerCase();
    if (!address) return [];
    const cleanProfile = (farcaster) => ({
      ...this._cleanProfile(farcaster),
      address,
    });

    let profiles = [];

    let farcaster = await getFarcasterUserByConnectedAddress(address);
    if (farcaster) {
      profiles.push(cleanProfile(farcaster));
    }
    farcaster = await getFarcasterUserByFid(address);
    if (farcaster) {
      profiles.push(cleanProfile(farcaster));
    }
    let fid = await getFidByCustodyAddress(address);
    if (fid) {
      farcaster = await getFarcasterUserByFid(fid);
      if (farcaster) {
        profiles.push(cleanProfile(farcaster));
      }
    }

    return profiles;
  }

  async getProfileByUsername(username) {
    if (!username) return null;
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
