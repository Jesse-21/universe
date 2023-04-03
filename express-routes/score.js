const app = require("express").Router();
const Sentry = require("@sentry/node");
const rateLimit = require("express-rate-limit");
const { Service: ScoreService } = require("../services/ScoreService");

const { mustBeBEBHolder } = require("../helpers/must-be-beb-holder");

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 1000 * 3, // 3 s
  max: 1, // limit each IP to 1 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  handler: (req, res, next) => {
    res
      .status(429)
      .send("Too many requests from this IP, please try again later.");
  },
});

app.use(limiter);

app.post("/:address", async (req, res) => {
  try {
    const token = req.headers.authorization?.slice(7) || "";
    if (req.body.accessToken) {
      if (process.env.SCORE_ACCESS_TOKEN !== req.body.accessToken) {
        throw new Error("Invalid score access token");
      }
    } else {
      await mustBeBEBHolder(token);
    }

    const score = await ScoreService.getScore(req.body.stats);
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
