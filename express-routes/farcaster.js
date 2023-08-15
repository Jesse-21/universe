const app = require("express").Router();
const Sentry = require("@sentry/node");

const rateLimit = require("express-rate-limit");
const { Service: _CacheService } = require("../services/cache/CacheService");

const { getAllRecentCasts, getCast, getCasts } = require("../helpers/warpcast");

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 3_000, // 3s
  max: 50, // limit each IP to 50 requests per windowMs
  message: "Too many requests, please try again later.",
});

const CacheService = new _CacheService();

const FARCASTER_KEY = "farcaster-express-endpoint";

app.get("/v1/feed", limiter, async (_req, res) => {
  try {
    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { key: "feed" },
    });
    if (data) {
      return res.json({
        result: { casts: data.casts },
      });
    }

    data = await getAllRecentCasts({
      token: process.env.FARQUEST_FARCASTER_APP_TOKEN,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { key: "feed" },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { casts: data.casts },
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
});

app.get("/v1/cast", limiter, async (req, res) => {
  try {
    let hash = req.query.hash;
    if (!hash) {
      return res.status(400).json({
        error: "Missing hash",
      });
    }
    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { hash },
    });
    if (data) {
      return res.json({
        result: { cast: data.cast },
      });
    }

    data = await getCast({
      token: process.env.FARQUEST_FARCASTER_APP_TOKEN,
      hash,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { hash },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { cast: data.cast },
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
});

app.get("/v1/casts", limiter, async (req, res) => {
  try {
    const fid = req.query.fid;
    const limit = req.query.limit || 10;
    const cursor = req.query.cursor || null;
    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { fid, limit, cursor },
    });
    if (data) {
      return res.json({
        result: { casts: data.casts, next: data.next },
      });
    }

    data = await getCasts({
      token: process.env.FARQUEST_FARCASTER_APP_TOKEN,
      fid,
      limit,
      cursor,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: {},
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { casts: data.casts, next: data.next },
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
});

module.exports = {
  router: app,
};
