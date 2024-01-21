const express = require("express");
const app = express.Router();
const Sentry = require("@sentry/node"); // Assuming Sentry for error tracking

const {
  Service: CommunityQuestService,
} = require("../services/CommunityQuestService");
const { Service: QuestService } = require("../services/QuestService");
const {
  Service: _CommunityQuestMutationService,
} = require("../services/mutationServices/CommunityQuestMutationService");
const { CommunityQuest } = require("../models/quests/CommunityQuest");
const { Account } = require("../models/Account");
const { CommunityReward } = require("../models/quests/CommunityReward");
const {
  CommunityRewardAccount,
} = require("../models/quests/CommunityRewardAccount");
const { Score } = require("../models/Score");
const { Quest } = require("../models/quests/Quest");
const { authContext, limiter } = require("../helpers/express-middleware");

// GET route for Community Quests
app.get("/v1/:communityId/quests", limiter, async (req, res) => {
  try {
    const { communityId } = req.params;
    const { limit, offset, sort } = req.query;
    const quests = await Quest.findAndSort({
      limit: limit,
      offset: offset,
      sort: sort,
      filters: {
        community: communityId,
      },
    });
    res.json({
      message: "Success",
      code: 200,
      success: true,
      quests,
    });
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ message: error.message });
  }
});

// GET route for Community Quest Status
app.get(
  "/v1/:communityId/quests/:questId/status",
  [limiter, authContext],
  async (req, res) => {
    try {
      const { communityId, questId } = req.params;
      const communityQuest = await CommunityQuest.findOne({
        community: communityId,
        quest: questId,
      });
      const status = await new CommunityQuestService().getQuestStatus(
        communityQuest,
        { communityId, questId },
        req.context
      );
      res.json({
        message: "Success",
        code: 200,
        success: true,
        status,
      });
    } catch (error) {
      Sentry.captureException(error);
      res.status(500).json({ message: error.message });
    }
  }
);

// GET route for Community Quest Leaderboard
app.get("/v1/:communityId/leaderboard", limiter, async (req, res) => {
  try {
    const { communityId } = req.params;
    const { limit } = req.query;
    const leaderboard = await Score.getLeaderboard(communityId, limit);
    res.json({
      message: "Success",
      code: 200,
      success: true,
      leaderboard,
    });
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ message: error.message });
  }
});

// GET route to check if Community Quest is claimed by an address
app.get(
  "/v1/:communityId/quests/:questId/claimed/:address",
  limiter,
  async (req, res) => {
    try {
      const { communityId, questId, address } = req.params;
      const account = await Account.findByAddressAndChainId({
        address,
        chainId: 1,
      });
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      const communityQuest = await CommunityQuest.findOne({
        community: communityId,
        quest: questId,
      });
      const isClaimed =
        await new CommunityQuestService().checkIfCommunityQuestClaimedByAddress(
          communityQuest,
          { communityId, questId },
          { account }
        );
      res.json({
        message: "Success",
        code: 200,
        success: true,
        isClaimed,
      });
    } catch (error) {
      Sentry.captureException(error);
      res.status(500).json({ message: error.message });
    }
  }
);

// POST route for claiming a Community Quest
app.post(
  "/v1/:communityId/quests/:questId/claim",
  [limiter, authContext],
  async (req, res) => {
    try {
      const { communityId, questId } = req.params;
      const { questData } = req.body;
      const CommunityQuestMutationService =
        new _CommunityQuestMutationService();

      const { communityQuest } =
        await CommunityQuestMutationService.claimRewardOrError(
          null,
          {
            communityId: communityId,
            questId: questId,
            questData: questData,
          },
          req.context
        );

      res.json({
        message: "Success",
        code: 200,
        success: true,
        communityQuest,
      });
    } catch (error) {
      console.log(error);
      Sentry.captureException(error);
      res.status(500).json({ message: error.message });
    }
  }
);

// GET route for Community Quest Status by Address
app.get(
  "/v1/:communityId/quests/:questId/status/:address",
  limiter,
  async (req, res) => {
    try {
      const { communityId, questId, address } = req.params;
      const account = await Account.findOrCreateByAddressAndChainId({
        address,
        chainId: 1,
      });

      const communityQuest = await CommunityQuest.findOne({
        community: communityId,
        quest: questId,
      });
      const service = new CommunityQuestService();
      const questStatus = await service.getQuestStatus(
        communityQuest,
        { communityId, questId },
        { account }
      );
      res.json({
        message: "Success",
        code: 200,
        success: true,
        questStatus,
      });
    } catch (error) {
      Sentry.captureException(error);
      res.status(500).json({ message: error.message });
    }
  }
);

// GET route for a specific Community Quest
app.get("/v1/:communityId/quests/:questId", limiter, async (req, res) => {
  try {
    const { communityId, questId } = req.params;
    const communityQuest = await CommunityQuest.findOne({
      community: communityId,
      quest: questId,
    });
    if (!communityQuest) {
      return res.status(404).json({ message: "Community Quest not found" });
    }
    res.json({
      message: "Success",
      code: 200,
      success: true,
      communityQuest,
    });
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ message: error.message });
  }
});

// GET route for Community Rewards
app.get(
  "/v1/:communityId/rewards",
  [limiter, authContext],
  async (req, res) => {
    try {
      const { communityId } = req.params;
      const { limit, offset } = req.query;
      const communityRewards = await CommunityReward.findAndSort({
        limit,
        offset,
        filters: { community: communityId },
      });
      const QuestServiceInstance = new QuestService();
      await Promise.all(
        communityRewards.map(async (communityReward) => {
          if (!communityReward.reward) {
            return;
          }
          const rewardItem = await QuestServiceInstance.getQuestReward(
            communityReward.reward
          );
          const rewardAccount = await CommunityRewardAccount.findOne({
            communityReward: communityReward._id,
            account: req.context.account?._id || req.context.accountId,
          });

          communityReward.reward.item = rewardItem;
          communityReward.reward.account = rewardAccount;
          return rewardItem;
        })
      );

      res.json({
        message: "Success",
        code: 200,
        success: true,
        communityRewards,
      });
    } catch (error) {
      console.log(error);
      Sentry.captureException(error);
      res.status(500).json({ message: error.message });
    }
  }
);

// POST route for Community Rewards
app.post(
  "/v1/:communityId/rewards/:communityRewardId",
  [limiter, authContext],
  async (req, res) => {
    try {
      const { communityId, communityRewardId } = req.params;
      const CommunityQuestMutationService =
        new _CommunityQuestMutationService();

      const { reward, communityReward } =
        await CommunityQuestMutationService.claimCommunityRewardOrError(
          null,
          {
            communityRewardId: communityRewardId,
          },
          req.context
        );
      res.json({
        message: "Success",
        code: 200,
        success: true,
        reward,
        communityReward,
      });
    } catch (error) {
      console.log(error);
      Sentry.captureException(error);
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = {
  router: app,
};
