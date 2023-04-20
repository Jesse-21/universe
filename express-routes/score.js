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
  max: 1, // limit each IP to 1 requests per windowMs
  message: "Too many requests, please try again later.",
  handler: async (req, res) => {
    const address = req.params.address;
    const score = await CacheService.get({
      key: SCORE_KEY,
      params: {
        address: address,
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
        address: address,
      },
    });

    if (!score) {
      score = await ScoreService.getScore(req.body.stats);
      await CacheService.set({
        key: SCORE_KEY,
        params: {
          address: address,
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
