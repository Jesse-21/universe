const app = require("express").Router();
const Sentry = require("@sentry/node");
const rateLimit = require("express-rate-limit");
const { Service: _CacheService } = require("../services/cache/CacheService");
const { AccountInvite } = require("../models/AccountInvite");
const {
  validateAndConvertAddress,
} = require("../helpers/validate-and-convert-address");
const {
  Service: _FarcasterHubService,
} = require("../services/identities/FarcasterHubService");

const CacheService = new _CacheService();

const REFERRAL_KEY = "ReferralService";
const REFERRAL_KEY_V2 = "ReferralServiceV2";

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 3_000, // 3s
  max: 10_000, // Need to implement IP based rate limiting (due to amazon load balancer)
  message: "Too many requests, please try again later.",
});

// Generic endpoint to verify referral code.
app.get("/v2/:referralCode/verify", limiter, async (req, res) => {
  try {
    const referralCode = req.params.referralCode;

    if (!referralCode) {
      throw new Error("Missing required params");
    }
    const accountInviteCode = await AccountInvite.findOne({
      code: referralCode,
    });
    if (!accountInviteCode) {
      return res.json({
        code: 500,
        success: false,
        message: "Invalid referral code",
      });
    }

    return res.json({
      code: 200,
      success: true,
    });
  } catch (e) {
    console.error(e);
    Sentry.captureException(e);
    return res.json({
      code: 500,
      success: false,
      message: e.message,
    });
  }
});

// Generic endpoint to create referral code.
app.post("/v2/:referralCode", limiter, async (req, res) => {
  try {
    const referralCode = req.params.referralCode;
    const address = req.body.address;
    if (!referralCode || !address) {
      throw new Error("Missing required params");
    }
    await CacheService.set({
      key: REFERRAL_KEY_V2,
      params: {
        address: validateAndConvertAddress(address),
      },
      value: `${referralCode}`,
    });
    return res.json({
      code: 200,
      success: true,
    });
  } catch (e) {
    console.error(e);
    Sentry.captureException(e);
    return res.json({
      code: 500,
      success: false,
      message: e.message,
    });
  }
});

app.post("/:referralCode", limiter, async (req, res) => {
  try {
    const referralCode = req.params.referralCode || "none";
    const address = req.body.address;
    const hash = req.body.hash;
    if (!referralCode || !address || !hash) {
      throw new Error("Missing required params");
    }
    await CacheService.set({
      key: REFERRAL_KEY,
      params: {
        address: validateAndConvertAddress(address),
      },
      value: `${referralCode}:${hash}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 36), // 36 hour cache to prevent overwrites
      // Always make this key expire, sometimes Alchemy is down and we need to retry!
    });
    return res.json({
      code: 200,
      success: true,
    });
  } catch (e) {
    console.error(e);
    Sentry.captureException(e);
    return res.json({
      code: 500,
      success: false,
      message: e.message,
    });
  }
});

app.get("/get-user/:referralCode", limiter, async (req, res) => {
  try {
    const referralCode = req.params.referralCode;
    const accountInviteCode = await AccountInvite.findOne({
      code: referralCode,
    });
    if (!accountInviteCode) {
      return res.json({
        code: 200,
        success: false,
      });
    }
    const withAccount = await accountInviteCode.populate("account");
    const account = withAccount.account;
    if (!account) {
      return res.json({
        code: 200,
        success: false,
      });
    }
    const FarcasterService = new _FarcasterHubService();
    const profile = await FarcasterService.getProfileByAccount(account);
    return res.json({
      code: 200,
      success: true,
      profile,
    });
  } catch (e) {
    console.error(e);
    Sentry.captureException(e);
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
