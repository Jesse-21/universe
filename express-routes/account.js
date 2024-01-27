const app = require("express").Router();
const Sentry = require("@sentry/node"); // Assuming Sentry is used for error tracking

const { Account } = require("../models/Account");
const { AccountInventory } = require("../models/AccountInventory");
const { Service: _ScoreService } = require("../services/ScoreService");
const { limiter, authContext } = require("../helpers/express-middleware");
const { Service: QuestService } = require("../services/QuestService");

// GET route for account.inventory
app.get("/v1/inventory", limiter, async (req, res) => {
  try {
    const { address, limit, offset, sort, filters } = req.query;

    const account = await Account.findByAddressAndChainId({
      address,
      chainId: 1,
    });
    if (!account) {
      throw new Error("Account not found");
    }
    let matchQuery = { account: account._id };
    if (filters) {
      try {
        const cleanFilters = JSON.parse(filters);
        matchQuery = { ...matchQuery, ...cleanFilters };
      } catch (e) {
        // filters is not a valid JSON string
        throw new Error("Invalid filters");
      }
    }

    const inventory = await AccountInventory.findAndSort({
      limit,
      offset,
      sort,
      // @TODO add more filters from req.query
      filters: matchQuery,
    });
    const QuestServiceInstance = new QuestService();
    await Promise.all(
      inventory.map(async (item) => {
        if (!item.rewardId) {
          return;
        }
        const rewardItem = await QuestServiceInstance.getQuestReward({
          rewardId: item.rewardId,
          type: item.rewardType,
        });

        item.reward = {
          _id: item.rewardId,
          type: item.rewardType,
          item: rewardItem,
        };

        return rewardItem;
      })
    );

    res.status(201).json({
      code: "201",
      success: true,
      message: "Success",
      inventory,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    res.status(500).json({
      code: "500",
      success: false,
      message: e.message,
    });
  }
});

// GET route for getCommunityAddressScore
app.get("/v1/score", limiter, async (req, res) => {
  try {
    const { address, bebdomain } = req.query;
    const ScoreService = new _ScoreService();
    const score = await ScoreService.getCommunityScore({
      address: address,
      bebdomain: bebdomain,
    });

    res.status(201).json({
      code: "201",
      success: true,
      message: "Success",
      score,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    res.status(500).json({
      code: "500",
      success: false,
      message: e.message,
    });
  }
});

app.post("/v1/update", [limiter, authContext], async (req, res) => {
  try {
    const account = req.context.account;
    if (!account) {
      throw new Error("Account not found");
    }
    const {
      email,
      location,
      wieldTag,
      profileImageId,
      bio,
      isOnboarded,
      expoPushToken,
    } = req.body;
    const updatedAccount = await account.updateMe({
      email,
      location,
      wieldTag,
      profileImageId,
      bio,
      isOnboarded,
      expoPushToken,
    });

    res.status(201).json({
      code: "201",
      success: true,
      message: "Success",
      account: updatedAccount,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    res.status(500).json({
      code: "500",
      success: false,
      message: e.message,
    });
  }
});

module.exports = {
  router: app,
};
