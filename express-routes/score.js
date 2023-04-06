const app = require("express").Router();
const Sentry = require("@sentry/node");
const rateLimit = require("express-rate-limit");
const { Service: ScoreService } = require("../services/ScoreService");
const cache = require("memory-cache");

const { mustBeBEBHolder } = require("../helpers/must-be-beb-holder");

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 1000, // 1s
  max: 2, // limit each IP to 2 requests per windowMs
  message: "Too many requests, please try again later.",
  handler: (req, res, next) => {
    const address = req.params.address;
    const score = cache.get(address);
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

app.use(limiter);

app.post("/:address", async (req, res) => {
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
    let score = cache.get(address);

    if (!score) {
      score = await ScoreService.getScore(req.body.stats);
      cache.put(address, score, 1000 * 60 * 60 * 72); // cache for 72 hours
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
