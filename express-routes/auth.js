const app = require("express").Router();
const Sentry = require("@sentry/node"); // Assuming Sentry is used for error tracking

const { Service: _AuthService } = require("../services/AuthService");
const { heavyLimiter, authContext } = require("../helpers/express-middleware");

// POST route for authentication by signature
app.post("/v1/auth-by-signature", heavyLimiter, async (req, res) => {
  const args = req.body; // Assuming arguments are sent in the body of the POST request

  try {
    const AuthService = new _AuthService();
    const { account, accessToken } = await AuthService.authenticate(args);

    res.status(201).json({
      code: "201",
      success: true,
      message: "Successfully authenticated",
      account,
      accessToken,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    res.status(500).json({
      code: "500",
      success: false,
      message: e.message,
    });
  }
});

module.exports = {
  router: app,
};
