const app = require("express").Router();
const Sentry = require("@sentry/node");

const { Service } = require("../services/AlchemyService");

const AlchemyService = new Service({
  apiKey: process.env.HOMESTEAD_NODE_URL,
});

const ENS_CONTRACT_ADDRESS = "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85";

/**
 * Get information about a Users ENS holding
 */
app.get("/owner/:filter?", async (req, res) => {
  try {
    if (!req.query.address) return { success: false };
    let ens = [];
    let pageKey = null;
    do {
      const data = await AlchemyService.getNFTs({
        owner: req.query.address,
        contractAddresses: [ENS_CONTRACT_ADDRESS],
        pageKey: pageKey,
      });
      let ensFromdata = (data["ownedNfts"] || []).map((nft) => {
        return nft["title"];
      });
      pageKey = data["pageKey"];
      ens = ens.concat(ensFromdata);
    } while (pageKey);
    if (req.params.filter) {
      if (req.params.filter === "10K") {
        ens = ens.filter((nft) => {
          return /^[0-9]{1,4}\.eth/.test(nft);
        });
      } else if (req.params.filter === "100K") {
        ens = ens.filter((nft) => {
          return /^[0-9]{1,5}\.eth/.test(nft);
        });
      } else if (req.params.filter === "999") {
        ens = ens.filter((nft) => {
          return /^[0-9]{1,3}\.eth/.test(nft);
        });
      } else if (req.params.filter === "3L") {
        ens = ens.filter((nft) => {
          return /^[A-Za-z]{1,3}\.eth/.test(nft);
        });
      } else {
        throw new Error("Invalid filter");
      }
    }
    return res.json({
      code: 200,
      success: ens?.length > 0,
      ens: ens,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.json({
      code: 500,
      success: false,
      message: e.message,
      ens: [],
    });
  }
});

module.exports = {
  router: app,
};
