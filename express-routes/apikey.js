const app = require("express").Router();
const Sentry = require("@sentry/node");
const { ApiKey } = require("../models/ApiKey");

const rateLimit = require("express-rate-limit");

const heavyLimiter = rateLimit({
  windowMs: 60_000,
  max: 1,
  message: "Too many requests! See docs.wield.co for more info.",
  validate: { limit: false },
});

const generateKey = () => {
  let code = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (let i = 1; i <= 25; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];

    if (i % 5 === 0 && i < 25) {
      code += "-";
    }
  }

  return code;
};

app.post("/create", heavyLimiter, async (req, res) => {
  try {
    const { description, email } = req.body;

    const isValidEmail = (email) => {
      const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return re.test(email);
    };

    if (!isValidEmail(email)) {
      return res.json({
        code: "400",
        success: false,
        message: "Invalid email address!",
      });
    }

    if (!description || description.length < 5) {
      return res.json({
        code: "400",
        success: false,
        message: "Description must be longer than 5 characters",
      });
    }

    const apiKey = await ApiKey.create({
      description,
      email,
      multiplier: 1,
      key: generateKey(),
    });

    Sentry.captureMessage(
      `New API key created for ${apiKey.email} with ${apiKey.description}! key=${apiKey.key}`
    );

    return res.json({
      code: "201",
      success: true,
      message: "Successfully created API key!",
      key: apiKey.key,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.json({
      code: "500",
      success: false,
      message: "Internal server error!",
    });
  }
});

module.exports = {
  router: app,
};
