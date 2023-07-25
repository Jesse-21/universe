const app = require("express").Router();
const Sentry = require("@sentry/node");
const rateLimit = require("express-rate-limit");
const { Service: _CacheService } = require("../services/cache/CacheService");

const CacheService = new _CacheService();

const REFERRAL_KEY = "ReferralService";

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 3_000, // 3s
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many requests, please try again later.",
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
        address,
      },
      value: `${referralCode}:${hash}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 36), // 36 hour cache to prevent overwrites
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

module.exports = {
  router: app,
};
