/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: contentSchema } = require("./content");
const { schema: accountActivitySchema } = require("./accountActivity");
const { schema: accountIdentitySchema } = require("./accountIdentity");
const { schema: accountRecovererSchema } = require("./accountRecoverer");

const schema = mongoose.Schema(
  {
    email: { type: String, index: true }, // email of the account
    walletEmail: { type: String, index: true }, // the email used to register a wallet
    encyrptedWalletJson: { type: String }, // the encrypted wallet json
    username: { type: String, index: true }, // username of the account
    usernameLowercase: { type: String, index: true }, // username of the account
    bio: contentSchema, // bio
    location: { type: String }, // location
    profileImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
    }, // profile image
    activities: accountActivitySchema,
    identities: accountIdentitySchema,
    sections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AccountSection",
        index: true,
      },
    ], // the professional experiences section
    addresses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AccountAddress",
        index: true,
      },
    ], // the account's addresses, default to only have one addreses[0]
    expoPushTokens: [String], // the account's expo push tokens
    recoverers: [accountRecovererSchema], // recoverers of the account, e.g. biometrics, another social account...
    deleted: { type: Boolean, default: false, index: true }, // whether the account is deleted
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });
schema.index({ updatedAt: -1 });
schema.index({ username: "text", bio: "text" });

module.exports = { schema };
