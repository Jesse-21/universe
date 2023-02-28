const app = require("express").Router();
const Sentry = require("@sentry/node");

const { Service } = require("../services/OpenseaService");

const { Community } = require("../models/Community");

const OpenseaService = new Service({
  apiKey: process.env.OPENSEA_API_KEY,
  baseUrl: "https://api.opensea.io/api/v1",
});

/**
 * Get collections asset owners
 */
app.get("/members", async (req, res) => {
  const { bebdomain, cursor = null } = req.query;
  const community = await Community.findOne({ bebdomain });

  try {
    const data = await OpenseaService.getAssetsByCollection({
      collection: community?.slug || bebdomain,
      cursor,
      limit: 50,
    });

    return res.json({ data });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

/**
 * Get community slugs for sitemap
 */
app.get("/sitemap", async (req, res) => {
  const { offset } = req.query;
  try {
    const communities = await Community.find({})
      .select("slug")
      .skip(offset)
      .limit(5000);

    return res.json({ communities });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

module.exports = {
  router: app,
};
