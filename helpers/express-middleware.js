// middleware.js
const Sentry = require("@sentry/node");
const rateLimit = require("express-rate-limit");
const { Account } = require("../models/Account");
const { ApiKey } = require("../models/ApiKey");
const { requireAuth } = require("../helpers/auth-middleware");
const { getMemcachedClient, getHash } = require("../connectmemcached");

const apiKeyCache = new Map(); // Two layers of cache, in memory and memcached

const getLimit = (baseMultiplier) => {
  // query ApiKeys to get the multiplier and return the multiplier * baseMultiplier or 0
  return async (req, _res) => {
    const key = req.header("API-KEY");
    if (!key) {
      const err = `Missing API-KEY header! Returning 0 for ${req.url}`;
      Sentry.captureMessage(err);
      return 0;
    }
    const memcached = getMemcachedClient();
    let apiKey;

    if (apiKeyCache.has(key)) {
      apiKey = apiKeyCache.get(key);
    } else {
      try {
        const data = await memcached.get(
          getHash(`WalletApiKey_getLimit:${key}`)
        );
        if (data) {
          apiKey = new ApiKey(JSON.parse(data.value));
          apiKeyCache.set(key, apiKey);
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (!apiKey) {
      apiKey = await ApiKey.findOne({ key });
      if (apiKey) {
        apiKeyCache.set(key, apiKey);
        try {
          await memcached.set(
            getHash(`WalletApiKey_getLimit:${key}`),
            JSON.stringify(apiKey),
            { lifetime: 60 * 60 } // 1 hour
          );
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (!apiKey) {
      const err = `API-KEY ${key} not found! Returning 0 for ${req.url}`;
      console.error(err);
      Sentry.captureMessage(err);
      return 0;
    }

    return Math.ceil(baseMultiplier * apiKey.multiplier);
  };
};

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 3_000,
  max: getLimit(2.5),
  message:
    "Too many requests or invalid API key! See docs.wield.co for more info.",
  validate: { limit: false },
});

const heavyLimiter = rateLimit({
  windowMs: 2_000,
  max: getLimit(0.3),
  message:
    "Too many requests or invalid API key! See docs.wield.co for more info.",
  validate: { limit: false },
});

const authContext = async (req, res, next) => {
  try {
    if (req.context && req.context.accountId) {
      return next();
    }

    const data = await requireAuth(req.headers.authorization?.slice(7) || "");
    if (!data.payload.id) {
      throw new Error("jwt must be provided");
    }
    const account = await Account.findById(data.payload.id);
    if (!account) {
      throw new Error(`Account id ${data.payload.id} not found`);
    }

    req.context = {
      ...(req.context || {}),
      accountId: data.payload.id,
      account,
    };
  } catch (e) {
    if (
      !e.message.includes("jwt must be provided") &&
      !e.message.includes("jwt malformed")
    ) {
      Sentry.captureException(e);
      console.error(e);
    }
    req.context = {
      ...(req.context || {}),
      accountId: null,
      account: null,
    };
  }
  next();
};

module.exports = {
  limiter,
  heavyLimiter,
  authContext,
};
