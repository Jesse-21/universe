const { AccountThread } = require("../models/AccountThread");
const { AccountCommunity } = require("../models/AccountCommunity");
const { AccountChannel } = require("../models/AccountChannel");

class AccessControlService {
  /**
   * Verify if an AccountThread exist with threadId and context.accountId
   * @returns Promise<Boolean>
   * */
  async accountThreadByThreadIdControl(_, { threadId }, context) {
    const existing = await AccountThread.exists({
      thread: threadId,
      account: context.accountId || context.account?._id,
    });
    if (!existing) return false;
    return true;
  }

  /**
   * Verify if an AccountCommunity exist with communityId and context.accountId
   * @returns Promise<Boolean>
   * */
  async accountCommunityByCommunityIdControl(_, { communityId }, context) {
    const existing = await AccountCommunity.exists({
      community: communityId,
      account: context.accountId || context.account?._id,
    });
    if (!existing) return false;
    return true;
  }

  /**
   * Verify if an AccountChannel exist with channelId and context.accountId
   * @returns Promise<Boolean>
   * */
  async accountChannelByChannelIdControl(_, { channelId }, context) {
    const existing = await AccountChannel.exists({
      channel: channelId,
      account: context.accountId || context.account?._id,
    });
    if (!existing) return false;
    return true;
  }
}

module.exports = { Service: AccessControlService };
