const {
  getFarcasterUserByFid,
  getFarcasterFidByCustodyAddress,
} = require("../../helpers/farcaster");

class FarcasterHubService {
  _getSigner(account, isExternal) {
    let existingRecoverer;

    if (isExternal === true) {
      existingRecoverer = account.recoverers?.find?.((r) => {
        return r.type === "FARCASTER_SIGNER_EXTERNAL";
      });
    } else if (isExternal === false) {
      existingRecoverer = account.recoverers?.find?.((r) => {
        return r.type === "FARCASTER_SIGNER";
      });
    } else {
      // just try both
      existingRecoverer = account.recoverers?.find?.((r) => {
        return r.type === "FARCASTER_SIGNER";
      });
      if (!existingRecoverer) {
        existingRecoverer = account.recoverers?.find?.((r) => {
          return r.type === "FARCASTER_SIGNER_EXTERNAL";
        });
      }
    }

    return existingRecoverer || null;
  }
  async getProfileByAccount(account, isExternal) {
    if (!account) return null;
    let existingRecoverer = this._getSigner(account, isExternal);
    if (!existingRecoverer) {
      return null;
    }

    const profile = await getFarcasterUserByFid(existingRecoverer.id);
    return profile;
  }
  async getFidByAccount(account, isExternal) {
    if (!account) return null;
    let existingRecoverer = this._getSigner(account, isExternal);
    if (!existingRecoverer) {
      // external account, fid is address or fid of custody address
      await account.populate("addresses");
      const address = account.addresses[0].address;
      if (isExternal) return address;
      // return fid of custody addresss
      const fid = await getFarcasterFidByCustodyAddress(address);
      return fid;
    }

    return existingRecoverer.id;
  }
  isExternalAccount(account) {
    const existingRecoverer = account.recoverers?.find?.((r) => {
      return r.type === "FARCASTER_SIGNER";
    });
    return !existingRecoverer;
  }
}

module.exports = { Service: FarcasterHubService };
