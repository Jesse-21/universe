const app = require("express").Router();
const Sentry = require("@sentry/node");

const { Service: ScoreService } = require("../services/ScoreService");

app.get("/:address", async (req, res) => {
  try {
    const address = req.params.address;
    const score = await ScoreService.getScore(address);
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
