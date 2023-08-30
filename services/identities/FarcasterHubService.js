const { getFarcasterUserByFid } = require("../../helpers/farcaster");

class FarcasterHubService {
  async getProfileByAccount(account) {
    if (!account) return null;
    const existingRecoverer = account.recoverers?.find?.((r) => {
      return r.type === "FARCASTER_SIGNER";
    });
    if (!existingRecoverer) return null;

    const profile = await getFarcasterUserByFid(existingRecoverer.id);
    return profile;
  }
  getFidByAccount(account) {
    if (!account) return null;
    const existingRecoverer = account.recoverers?.find?.((r) => {
      return r.type === "FARCASTER_SIGNER";
    });
    if (!existingRecoverer) return null;

    return existingRecoverer.id;
  }
}

module.exports = { Service: FarcasterHubService };
