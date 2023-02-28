/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: richBlocksSchema } = require("../richContentBlock");

/**
 * Asset
 */
const schema = mongoose.Schema(
  {
    // the url of the asset on the server
    url: { type: String },
    // the name of the asset
    name: { type: String },
    assetType: { type: String, enum: ["LAND", "PROPS", "HUMANOID"] },
    // the format of the asset
    format: { type: String, enum: ["FBX", "GLTF"] },
    // the image preview of the asset
    previewImage: {
      type: String,
    },
    description: { type: String },

    rarity: {
      type: String,
      enum: [
        "COMMON",
        "UNCOMMON",
        "RARE",
        "EPIC",
        "LEGENDARY",
        "MYTICAL",
        "ONE_OF_ONE",
      ],
    },

    components: [richBlocksSchema], // e.g can be a scriptable action
  },
  { timestamps: true }
);

module.exports = { schema };
