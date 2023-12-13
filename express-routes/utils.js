const app = require("express").Router();
const Sentry = require("@sentry/node");
const { Service: _CacheService } = require("../services/cache/CacheService");
const {
  Service: _MarketplaceService,
} = require("../services/MarketplaceService");
const { Account } = require("../models/Account");
const { AccountInvite } = require("../models/AccountInvite");
const { verifyTwitter } = require("../helpers/verify-social");
const rateLimit = require("express-rate-limit");
const { getFarcasterUserByFid } = require("../helpers/farcaster");
const { Fids } = require("../models/farcaster");

// Rate limiting middleware
const heavyLimiter = rateLimit({
  windowMs: 5_000, // 5s
  max: 10_000, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
  handler: (req, res, next) => {
    res.status(429).send("Too many requests, please try again later.");
  },
});

app.get("/eth-to-usd", async (req, res) => {
  const eth = req.query.eth;
  if (!eth)
    return res.json({
      code: 200,
      success: true,
      usd: 0,
    });

  try {
    const MarketplaceService = new _MarketplaceService();
    const usd = await MarketplaceService.ethToUsd(eth);

    return res.json({
      code: 200,
      success: true,
      usd,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.json({
      code: 500,
      success: false,
      message: e.message,
    });
  }
});

app.get("/get-riddle", async (req, res) => {
  const address = req.query.address;
  if (!address)
    return res.json({
      code: 500,
      success: false,
      message: "Address is required",
    });
  try {
    const account = await Account.findOrCreateByAddressAndChainId({
      address,
      chainId: 1,
    });
    const invite = await AccountInvite.findOrCreate({
      accountId: account._id,
    });

    const CacheService = new _CacheService();
    await CacheService.getOrCallbackAndSet(() => invite.code, {
      key: "InviteCode",
      params: {
        address,
      },
      expiresAt: null,
    });

    return res.json({
      code: 200,
      success: true,
      inviteCode: invite.code,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.json({
      code: 500,
      success: false,
      message: e.message,
    });
  }
});

app.get("/verfy-riddle", async (req, res) => {
  const address = req.query.address;
  if (!address)
    return res.json({
      code: 500,
      success: false,
      message: "Address is required",
    });
  try {
    const CacheService = new _CacheService();
    const cachedInviteCode = await CacheService.get({
      key: "InviteCode",
      params: {
        address,
      },
    });
    const existingVerified = await CacheService.get({
      key: "VerifiedInviteCode",
      params: {
        address,
      },
    });
    if (existingVerified) {
      return res.json({
        code: 200,
        success: true,
        verified: true,
      });
    }
    const type = req.query.type || "twitter";
    let verified = false;
    if (type === "twitter") {
      verified = await verifyTwitter(req.query.url, cachedInviteCode);
    } else if (type === "farcaster") {
      verified = true;
    }
    if (verified) {
      await CacheService.set({
        key: "VerifiedInviteCode",
        params: {
          address,
        },
        value: true,
        expiresAt: null,
      });
      return res.json({
        code: 200,
        success: true,
        verified,
      });
    } else {
      return res.json({
        code: 200,
        success: true,
        verified: false,
      });
    }
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.json({
      code: 500,
      success: false,
      message: e.message,
    });
  }
});

app.get("/need-invite", heavyLimiter, async (req, res) => {
  const email = req.query.email;
  if (!email)
    return res.json({
      code: 500,
      success: false,
      message: "Email is required",
    });
  try {
    const CacheService = new _CacheService();
    await CacheService.set({
      key: "NeedInvite",
      params: {
        email,
      },
      value: email,
      expiresAt: null,
    });
    return res.json({
      code: 200,
      success: true,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.json({
      code: 500,
      success: false,
      message: e.message,
    });
  }
});

const filteredUser = async (fid) => {
  if (!fid) return null;
  const user = await getFarcasterUserByFid(fid);
  if (
    !user.username ||
    !user.displayName ||
    user.external ||
    user.followerCount < 1 ||
    user.username.includes("-")
  )
    return null;

  return user.username;
};

app.get("/recent-users", heavyLimiter, async (req, res) => {
  const NEEDED_USERS = 3;
  const MINIMUM_USERS = 3;
  try {
    const fids = await Fids.find({}).sort({ createdAt: -1 }).limit(750);
    fids.sort(() => Math.random() - 0.5);
    const users = [];
    for (let i = 0; i < fids.length; i++) {
      const user = await filteredUser(fids[i].fid);
      if (user) {
        users.push(user);
      }
      if (users.length >= NEEDED_USERS) {
        break;
      }
    }
    if (users.length < MINIMUM_USERS) {
      Sentry.captureMessage(`Could not find at least ${MINIMUM_USERS} users!`);
      return res.json({
        code: 200,
        success: true,
        users: [],
      });
    }
    return res.json({
      code: 200,
      success: true,
      users,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.json({
      code: 500,
      success: false,
      message: e.message,
    });
  }
});

module.exports = {
  router: app,
};
