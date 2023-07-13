/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: contentSchema } = require("../content");
const { schema: keyValueFieldsSchema } = require("../keyValueFields");

/**
 * A quest requirement schema
 */
const questRequirementSchema = mongoose.Schema({
  title: { type: String },
  type: {
    type: String,
    enum: [
      "COMMUNITY_PARTICIPATION",
      "SCORE",
      "FARCASTER_ACCOUNT",
      "FARCASTER_FOLLOWERS_10",
      "FARCASTER_FOLLOWERS_100",
      "FARCASTER_FOLLOWERS_1000",
      "FARCASTER_FOLLOWERS_5000",
      "FARCASTER_FOLLOWERS_10000",
      "FARCASTER_CASTS_250",
      "FARCASTER_CASTS_100",
      "FARCASTER_CASTS_1",
      "FARCASTER_COMMENT_10",
      "FARCASTER_LIKES_10",
      "FARCASTER_LIKES_100",
      "FARCASTER_LIKES_500",
      "FARCASTER_FARQUEST_TAGGED",
      "VALID_NFT",
      "VALID_NFT_3",
      "VALID_NFT_5",
    ],
  }, // e.g API, COMMUNITY_PARTICIPATION, TWITTER_FOLLOW, etc
  // e.g. { key: "twitterHandle", value: "bebverse" } for TWITTER_FOLLOW
  // e.g. { key: "apiEndpoint", value: "https://api.bebverse.com/quest/1" } for API
  data: [keyValueFieldsSchema],
  description: contentSchema,
});

/**
 * A quest rewards schema
 */
const questRewardsSchema = mongoose.Schema({
  title: { type: String },
  type: { type: String, enum: ["ASSET_3D", "SCORE", "IMAGE", "NFT"] }, // e.g Assets, NFTs...

  // in case of score, this is the amount of modifier to apply to the score
  // for asset, -1 then it is unlimited, create a 'copiable' reward e.g a prefab
  quantity: { type: Number, default: 1 },

  rewardId: { type: mongoose.Schema.Types.ObjectId, index: true },
  category: { type: String }, // can add a category e.g. consumable, etc
});

/**
 *
 */
const schema = mongoose.Schema(
  {
    description: contentSchema,
    title: { type: String },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Community",
    },
    schedule: { type: String, enum: ["ONCE", "DAILY", "WEEKLY", "MONTHLY"] },
    imageUrl: {
      type: String,
    },
    /** Array of requirement */
    requirements: [questRequirementSchema],
    /** Array of rewards */
    rewards: [questRewardsSchema],
  },
  { timestamps: true }
);

module.exports = { schema, questRequirementSchema, questRewardsSchema };
