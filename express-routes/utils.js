const app = require("express").Router();
const Sentry = require("@sentry/node");

app.get("/eth-to-usd", async (req, res) => {
  const eth = req.query.eth;
  if (!eth)
    return res.json({
      code: 200,
      success: true,
      usd: 0,
    });

  try {
    const usd = 0;

    return res.json({
      code: 200,
      success: true,
      usd,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
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
