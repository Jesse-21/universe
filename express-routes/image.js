const app = require("express").Router();
const formidable = require("formidable");
const Sentry = require("@sentry/node");

const { Image } = require("../models/Image");

const { Service } = require("../services/OpenseaService");

const OpenseaService = new Service({
  apiKey: process.env.OPENSEA_API_KEY,
  baseUrl: "https://api.opensea.io/api/v1",
});

app.post("/upload", async (req, res) => {
  try {
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = formidable();
      form.parse(req, (err, fields, _files) => {
        if (err) return reject(err);
        resolve({ fields, files: _files });
      });
    });
    if (!files?.files && !fields?.files) {
      return res.json({
        code: "500",
        success: false,
        message: "No files selected",
      });
    }

    const imageFile = files?.files || fields?.files;
    const image = await Image.uploadImage({
      image: imageFile,
    });
    return res.json({
      code: "201",
      success: true,
      message: "Successfully created image",
      image,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.json({
      code: "500",
      success: false,
      message: e.message,
    });
  }
});

app.get("/nfts-by-address", async (req, res) => {
  const { address, cursor = null, limit = 20 } = req.query;
  const opts = {
    owner: address,
    limit: parseInt(limit),
    cursor,
  };

  try {
    const data = await OpenseaService.getAssetsByOwner(opts);
    return res.json({
      assets: data?.assets || [],
      previous: data?.previous || null,
      next: data?.next || null,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

app.post("/upload-and-verify-nft", async (req, res) => {
  const { address, tokenId, contractAddress } = req.body;
  if (!address || !tokenId || !contractAddress) {
    return res.json({
      code: "500",
      success: false,
      message: "Invalid address or tokenId",
    });
  }
  const opts = {
    owner: address,
    token_ids: tokenId,
    asset_contract_address: contractAddress,
  };
  try {
    const data = await OpenseaService.getAssetsByOwner(opts);

    const found = data?.assets?.[0];
    if (!found) {
      return res.json({
        code: "500",
        success: false,
        message: "Invalid NFT",
      });
    }
    const image = await Image.create({
      src: found.image_url,
      isVerified: true,
      verificationOrigin: "NFT",
      verificationExternalUrl: found.permalink,
      name: found.name,
      verificationTokenId: found.token_id,
      verificationContractAddress: found.asset_contract.address,
      verificationChainId: parseInt(process.env.CHAIN_ID || 1),
    });
    return res.json({
      code: "201",
      success: true,
      message: "Successfully created image",
      image,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.json({
      code: "500",
      success: false,
      message: e.message,
    });
  }
});

module.exports = {
  router: app,
};
