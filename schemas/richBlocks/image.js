/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");
const { schema: keyValueFieldsSchema } = require("../keyValueFields");
const { schema: layersSchema } = require("../layers");
/**
 * An image that can be a pointer url to an NFT, POAP, etc
 */
const schema = mongoose.Schema({
  src: { type: String },
  name: { type: String }, // the alt text and used for the initial in case image is not available
  description: { type: String }, // the description of the image
  isVerified: { type: Boolean, default: false }, // if the image is verified
  verificationOrigin: { type: String }, // the source of image verification, i.e ERC721, POAP...
  verificationTokenId: { type: String },
  verificationChainId: { type: Number },
  verificationContractAddress: { type: String },
  verificationExternalUrl: { type: String }, // the external url for image verification, can be Opensea, Poap, Etherscan...
  metadata: [keyValueFieldsSchema],
  layers: [layersSchema],
});

module.exports = { schema };
