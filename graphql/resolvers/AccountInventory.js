const {
  Service: _QuestRewardService,
} = require("../../services/QuestRewardService");
const { Account } = require("../../models/Account");
const resolvers = {
  AccountInventoryItem: {
    account: async (parent) => {
      const account = await Account.findById(parent.account);
      return account;
    },
    reward: async (parent) => {
      const QuestService = new _QuestRewardService();
      const reward = await QuestService.getQuestRewardItem({
        type: parent.rewardType,
        rewardId: parent.rewardId,
      });

      if (parent.rewardType === "ASSET_3D") {
        return {
          _id: parent.rewardId,
          type: parent.rewardType,
          asset3D: reward,
        };
      } else if (parent.rewardType === "IMAGE") {
        return {
          _id: parent.rewardId,
          type: parent.rewardType,
          image: reward,
        };
      } else {
        return null;
      }
    },
  },
};

module.exports = { resolvers };
