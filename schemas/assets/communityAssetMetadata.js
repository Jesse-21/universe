/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: modification3DSchema } = require("../vector/modification3D");
const { schema: vector3DSchema } = require("../vector/vector3D");

/**
 * Community owned assets
 * 1 to M with CommunityAsset
 */
const schema = mongoose.Schema(
  {
    // the id of the community asset
    communityAsset: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "CommunityAsset",
    },
    modification: modification3DSchema, // the modifications of the assets,
    position: vector3DSchema, // Last position updated
    componentsOverride: {
      type: Map, // key is the component id, value is the component override e.g. { url: "new-url.xyz" }
      of: Map,
    },
  },
  { timestamps: true }
);

module.exports = { schema };
