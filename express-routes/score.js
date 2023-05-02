const app = require("express").Router();
const Sentry = require("@sentry/node");
const rateLimit = require("express-rate-limit");
const { Service: ScoreService } = require("../services/ScoreService");
const { Service: _CacheService } = require("../services/cache/CacheService");
const { mustBeBEBHolder } = require("../helpers/must-be-beb-holder");

const CacheService = new _CacheService();

const SCORE_KEY = "BebScoreService";

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 3_000, // 3s
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many requests, please try again later.",
  skip: async (req, _res) => {
    // skip rate limiting for requests that have a cached score
    const address = req.params.address;
    const scoreType = req.query.scoreType || "beb";
    const score = await CacheService.get({
      key: SCORE_KEY,
      params: {
        address: address,
        scoreType,
      },
    });
    return !!score;
  },
  handler: async (req, res) => {
    const address = req.params.address;
    const scoreType = req.query.scoreType || "beb";
    const score = await CacheService.get({
      key: SCORE_KEY,
      params: {
        address: address,
        scoreType,
      },
    });

    if (score) {
      return res.json({
        code: 200,
        success: true,
        score,
      });
    }
    res.status(429).send("Too many requests, please try again later.");
  },
});

app.post("/:address", limiter, async (req, res) => {
  try {
    const address = req.params.address;
    const token = req.headers.authorization?.slice(7) || "";
    const scoreType = req.query.scoreType || "beb";
    const stats = req.body.stats;
    if (["beb", "social"].indexOf(scoreType) === -1) {
      throw new Error("Invalid score type");
    }
    if (req.body.accessToken) {
      if (process.env.SCORE_ACCESS_TOKEN !== req.body.accessToken) {
        throw new Error("Invalid score access token");
      }
    } else {
      await mustBeBEBHolder(token);
    }
    let score = await CacheService.get({
      key: SCORE_KEY,
      params: {
        address,
        scoreType,
      },
    });

    if (!score) {
      if (!stats) {
        throw new Error("Missing stats!");
      }
      score = await ScoreService.getScore(stats, {
        scoreType: scoreType,
      });

      await CacheService.set({
        key: SCORE_KEY,
        params: {
          address,
          scoreType,
        },
        value: score,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72), // 72 hour cache
      });
    }
    return res.json({
      code: 200,
      success: true,
      score,
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
