const app = require("express").Router();
const Sentry = require("@sentry/node");
const fetch = require("node-fetch");
const rateLimit = require("express-rate-limit");
const { Service: _CacheService } = require("../services/cache/CacheService");

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 3_000, // 3s
  max: 50, // limit each IP to 50 requests per windowMs
  message: "Too many requests, please try again later.",
});

const CacheService = new _CacheService();

const FARCASTER_KEY = "farcaster-express-endpoint";

const fetchRetry = async (url, options, retries = 3) => {
  let error;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (e) {
      error = e;
    }
    // wait N seconds exponentially
    await new Promise((r) => setTimeout(r, 2 ** (i + 1) * 1000));
  }
  throw error;
};

const getAllRecentCasts = async ({ token }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/recent-casts?limit=1000`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
      timeout: 5_000,
    }
  );
  const json = await response.json();
  return { casts: json?.result?.casts };
};

app.get("/feed", limiter, async (_req, res) => {
  try {
    let data = await CacheService.get({
      key: FARCASTER_KEY,
      params: {},
    });
    if (data) {
      return res.json({
        casts: data.casts,
      });
    }

    data = await getAllRecentCasts({
      token: process.env.FARQUEST_FARCASTER_APP_TOKEN,
    });

    await CacheService.set({
      key: FARCASTER_KEY,
      params: {},
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      casts: data.casts,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
});

module.exports = {
  router: app,
};
