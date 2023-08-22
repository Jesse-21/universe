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
}

module.exports = { Service: FarcasterHubService };
