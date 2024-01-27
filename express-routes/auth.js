const app = require("express").Router();
const Sentry = require("@sentry/node"); // Assuming Sentry is used for error tracking

const { Service: _AuthService } = require("../services/AuthService");
const {
  heavyLimiter,
  authContext,
  limiter,
} = require("../helpers/express-middleware");
const { AccountInvite } = require("../models/AccountInvite");

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

// GET route for getAccountSigninMessage
app.get("/v1/get-account-signin-message", heavyLimiter, async (req, res) => {
  const { address, chainId = 1, creationOrigin } = req.query;
  if (!address) {
    return res.json({
      code: 500,
      success: false,
      message: "Address is required",
    });
  }
  try {
    const AuthService = new _AuthService();
    const signature = await AuthService.getMessageToSign({
      address,
      chainId,
      creationOrigin,
    });

    res.status(201).json({
      code: "201",
      success: true,
      message: "Success",
      signature,
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

// GET route for getCurrentAccount
app.get("/v1/get-current-account", [limiter, authContext], async (req, res) => {
  try {
    const account = req.context.account;
    if (!account) {
      throw new Error("Account not found");
    }
    const [, invite] = await Promise.all([
      await account.populate("addresses profileImage"),
      await AccountInvite.findOrCreate({
        accountId: account._id,
      }),
    ]);

    res.status(201).json({
      code: "201",
      success: true,
      message: "Success",
      account: {
        ...account.toObject(),
        invite,
      },
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
