const app = require("express").Router();
const Sentry = require("@sentry/node");

const { Service: ScoreService } = require("../services/ScoreService");

const { mustBeBEBHolder } = require("../helpers/must-be-beb-holder");

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
