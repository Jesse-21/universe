const app = require("express").Router();
const Sentry = require("@sentry/node");

const rateLimit = require("express-rate-limit");
const { Service: _AlchemyService } = require("../services/AlchemyService");
const { Account } = require("../models/Account");
const { ApiKey } = require("../models/ApiKey");
const { Network } = require("alchemy-sdk");

const {
  getOnchainTransactions,
  getOnchainAssets,
} = require("../helpers/wallet");

const { requireAuth } = require("../helpers/auth-middleware");
const { getMemcachedClient, getHash } = require("../connectmemcached");

const apiKeyCache = new Map(); // two layers of cache, in memory and memcached

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

/** Refetch chains, save the synced inventory (with memcached), and return */
/** Should poll this endpoint to get the most up to date inventory */
app.get("/v1/assets", [authContext, limiter], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 1_000);
    const cursor = req.query.cursor || null;
    const address = req.query.address; // we support viewing other addresses' assets

    const memcached = getMemcachedClient();
    try {
      const data = await memcached.get(
        getHash(`Wallet_transactions:${limit}:${cursor}:${address}`)
      );
      if (data) {
        return res.json({
          source: "v1",
          transactions: JSON.parse(data.value),
        });
      }
    } catch (e) {
      console.error(e);
    }

    const networks = [
      Network.ETH_MAINNET,
      Network.OPT_MAINNET,
      Network.BASE_MAINNET,
      Network.MATIC_MAINNET,
    ];

    const assets = await Promise.all(
      networks.map((network) => getOnchainAssets(address, network))
    );
    // map network to transactions in hashmap
    const assetsMap = {};
    assets.forEach((networkAssets, i) => {
      assetsMap[networks[i]] = networkAssets;
    });

    try {
      await memcached.set(
        getHash(`Wallet_assets:${limit}:${cursor}:${address}`),
        JSON.stringify(assetsMap),
        { lifetime: 60 * 60 } // 1 hour
      );
    } catch (e) {
      console.error(e);
    }

    return res.json({
      source: "v1",
      assets: assetsMap,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

/** Refetch chains, query transactions on all chains (with cache into memcached), and return */
app.get("/v1/transactions", [authContext, limiter], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 1_000);
    const cursor = req.query.cursor || null;
    const address = req.query.address; // we support viewing other addresses' transactions

    const memcached = getMemcachedClient();
    try {
      const data = await memcached.get(
        getHash(`Wallet_transactions:${limit}:${cursor}:${address}`)
      );
      if (data) {
        return res.json({
          source: "v1",
          transactions: JSON.parse(data.value),
        });
      }
    } catch (e) {
      console.error(e);
    }

    const networks = [
      Network.ETH_MAINNET,
      Network.OPT_MAINNET,
      Network.BASE_MAINNET,
      Network.MATIC_MAINNET,
    ];

    const transactions = await Promise.all(
      networks.map((network) => getOnchainTransactions(address, network))
    );
    // map network to transactions in hashmap
    const transactionsMap = {};
    transactions.forEach((networkTransactions, i) => {
      transactionsMap[networks[i]] = networkTransactions;
    });

    try {
      await memcached.set(
        getHash(`Wallet_transactions:${limit}:${cursor}:${address}`),
        JSON.stringify(transactionsMap),
        { lifetime: 60 * 60 } // 1 hour
      );
    } catch (e) {
      console.error(e);
    }

    return res.json({
      source: "v1",
      transactions: transactionsMap,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

module.exports = {
  router: app,
};
