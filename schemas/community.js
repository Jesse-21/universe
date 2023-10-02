/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");
const { schema: socialLinksSchema } = require("./socialLinks");
const { schema: contentSchema } = require("./content");

const schema = mongoose.Schema(
  {
    /** Name of a community. Mutable by owner. */
    name: {
      type: String,
      required: true,
      index: true,
    },
    /** Description of a community. */
    bio: {
      type: contentSchema,
    },
    /** Main profile image of a community. Mutable by owner */
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
    },
    /** Main banner image of a community. Mutable by owner */
    bannerImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
    },
    /** the hashed label from the registrar tokenId */
    bebdomain: {
      type: String,
      index: true,
    },
    /** the tld of the dimension */
    tld: {
      type: String,
      index: true,
      default: "beb",
    },
    /** The location of the server (for self-hosting) */
    host: {
      type: String,
      index: true,
      default: "https://protocol.wield.co/graphql",
    },
    /** the hashed token Id from the registrar */
    tokenId: {
      type: String,
      index: true,
    },
    /** The social links for the community */
    socialLinks: {
      type: socialLinksSchema,
    },
    /** The owner of the token in the registrar */
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
    /** All permissions, including custom permissions for the community
     * Default to admin, read and write */
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
        index: true,
      },
    ],
    /** All roles defined by owner for the community */
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
        index: true,
      },
    ],
    channels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Channel",
        index: true,
      },
    ],
    /** Description of a community. Mutable by owner. @TODO deprecate this in favor of bio */
    description: {
      type: String,
    },
    isFeatured: {
      type: Boolean,
      index: true,
      default: false,
    },
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });
schema.index({ updatedAt: -1 });
schema.index({ name: "text", bio: "text" });

module.exports = { schema };
