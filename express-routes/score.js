const app = require("express").Router();
const Sentry = require("@sentry/node");

const { Service: ScoreService } = require("../services/ScoreService");

app.post("/:address", async (req, res) => {
  try {
    const score = await ScoreService.getScore(req.body);
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
