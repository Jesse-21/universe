/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: modification3DSchema } = require("../vector/modification3D");
const { schema: vector3DSchema } = require("../vector/vector3D");

/**
 * Community owned assets
 */
const schema = mongoose.Schema(
  {
    // the id of the asset
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    // the type of the asset
    type: { type: String, enum: ["ASSET_3D"] },

    // the id of the community
    community: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Community",
    },
    modification: modification3DSchema, // the modifications of the assets,
    position: vector3DSchema, // Last position updated
    positions: [vector3DSchema], // the tile positions of the asset
    maxQuantity: { type: Number, default: 1 }, // the max quantity of the asset
    metadata: [
      {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        ref: "CommunityAssetMetadata",
      },
    ],
  },
  { timestamps: true }
);

module.exports = { schema };
