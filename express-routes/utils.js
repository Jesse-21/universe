const app = require("express").Router();
const Sentry = require("@sentry/node");
const { Service: _CacheService } = require("../services/cache/CacheService");
const riddlesJson = require("../helpers/riddles.json");
const { verifyTwitter } = require("../helpers/verify-social");

app.get("/eth-to-usd", async (req, res) => {
  const eth = req.query.eth;
  if (!eth)
    return res.json({
      code: 200,
      success: true,
      usd: 0,
    });

  try {
    const usd = 0;

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
    const CacheService = new _CacheService();
    let riddle = riddlesJson[Math.floor(Math.random() * riddlesJson.length)];
    while (riddle.length >= 190) {
      riddle = riddlesJson[Math.floor(Math.random() * riddlesJson.length)];
    }
    const cachedRiddle = await CacheService.getOrCallbackAndSet(
      () => riddle.riddle,
      {
        key: "Riddle",
        params: {
          address,
        },
        expiresAt: null,
      }
    );

    return res.json({
      code: 200,
      success: true,
      riddle: cachedRiddle,
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
    const cachedRiddle = await CacheService.get({
      key: "Riddle",
      params: {
        address,
      },
    });
    const existingVerified = await CacheService.get({
      key: "VerifiedRiddle",
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
      verified = await verifyTwitter(req.query.url, cachedRiddle);
    } else if (type === "farcaster") {
      verified = true;
    }
    if (verified) {
      await CacheService.set({
        key: "VerifiedRiddle",
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

module.exports = {
  router: app,
};
