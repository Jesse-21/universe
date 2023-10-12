const {
  getFarcasterUserByFid,
  createOrFindExternalFarcasterUser,
} = require("../../helpers/farcaster");

class FarcasterHubService {
  async getProfileByAccount(account) {
    let existingRecoverer;
    if (!account) return null;
    existingRecoverer = account.recoverers?.find?.((r) => {
      return r.type === "FARCASTER_SIGNER";
    });
    if (!existingRecoverer) {
      // try finding external
      existingRecoverer = account.recoverers?.find?.((r) => {
        return r.type === "FARCASTER_SIGNER_EXTERNAL";
      });
    }
    if (!existingRecoverer) {
      return null;
    }
    // if (!existingRecoverer) {
    //   // external account, create or find profile
    //   await account.populate("addresses");
    //   const address = account.addresses[0].address;
    //   return await createOrFindExternalFarcasterUser(address);
    // }

    const profile = await getFarcasterUserByFid(existingRecoverer.id);
    return profile;
  }
  async getFidByAccount(account) {
    if (!account) return null;

    let existingRecoverer = account.recoverers?.find?.((r) => {
      return r.type === "FARCASTER_SIGNER";
    });

    if (!existingRecoverer) {
      // try finding external
      existingRecoverer = account.recoverers?.find?.((r) => {
        return r.type === "FARCASTER_SIGNER_EXTERNAL";
      });
    }
    if (!existingRecoverer) {
      // external account, fid is address
      await account.populate("addresses");
      const address = account.addresses[0].address;
      return address;
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
