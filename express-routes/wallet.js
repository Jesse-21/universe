const app = require("express").Router();
const Sentry = require("@sentry/node");

const rateLimit = require("express-rate-limit");
const { Service: _AlchemyService } = require("../services/AlchemyService");
const { Account } = require("../models/Account");
const { ApiKey } = require("../models/ApiKey");
const { Network } = require("alchemy-sdk");

const {
  getOnchainNFTs,
  getOnchainTransactions,
  getOnchainTokens,
  DEFAULT_NETWORKS,
  DEFAULT_LIMIT,
  DEFAULT_NFT_LIMIT,
  DEFAULT_CURSORS,
  SKIP_CURSOR,
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

app.get("/v1/nfts", [authContext, heavyLimiter], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || DEFAULT_NFT_LIMIT); // If you don't use the default limit, check webhook.js for clearing memcached!
    const networks = req.query.networks || DEFAULT_NETWORKS; // If you don't use the default networks, check webhook.js for clearing memcached!
    const cursors = req.query.cursors || DEFAULT_CURSORS; // we also support the 'skip' cursor

    const address = req.query.address; // we support viewing other addresses' transactions

    const transactions = await Promise.all(
      networks.map((network, i) =>
        cursors[i] === SKIP_CURSOR
          ? []
          : getOnchainNFTs(address, network, cursors[i], limit)
      )
    );
    // map network to transactions in hashmap
    const transactionsMap = {};
    transactions.forEach((networkTransactions, i) => {
      transactionsMap[networks[i]] = networkTransactions;
    });

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

/** Refetch chains, save the synced inventory (with memcached), and return */
/** Should poll this endpoint to get the most up to date inventory */
app.get("/v1/tokens", [authContext, limiter], async (req, res) => {
  try {
    const _limit = parseInt(req.query.limit || DEFAULT_LIMIT); // Not used by alchemy ATM. If you don't use the default limit, check webhook.js for clearing memcached!
    const cursors = req.query.cursors || DEFAULT_CURSORS; // we also support the 'skip' cursor
    const networks = req.query.networks || DEFAULT_NETWORKS; // If you don't use the default networks, check webhook.js for clearing memcached!
    const address = req.query.address; // we support viewing other addresses' assets

    const assets = await Promise.all(
      networks.map((network, i) =>
        cursors[i] === SKIP_CURSOR
          ? []
          : getOnchainTokens(address, network, cursors[i])
      )
    );
    // map network to transactions in hashmap
    const assetsMap = {};
    assets.forEach((networkAssets, i) => {
      assetsMap[networks[i]] = networkAssets;
    });

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
    const limit = parseInt(req.query.limit || DEFAULT_LIMIT); // If you don't use the default limit, check webhook.js for clearing memcached!
    const networks = req.query.networks || DEFAULT_NETWORKS; // If you don't use the default networks, check webhook.js for clearing memcached!
    const cursors = req.query.cursors || DEFAULT_CURSORS; // we also support the 'skip' cursor

    const address = req.query.address; // we support viewing other addresses' transactions

    const transactions = await Promise.all(
      networks.map((network, i) =>
        cursors[i] === SKIP_CURSOR
          ? []
          : getOnchainTransactions(address, network, {
              cursor: cursors[i],
              limit,
            })
      )
    );
    // map network to transactions in hashmap
    const transactionsMap = {};
    transactions.forEach((networkTransactions, i) => {
      transactionsMap[networks[i]] = networkTransactions;
    });

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
