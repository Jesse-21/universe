const mongoose = require("mongoose");

// HubSubscriptions
const hubSubscriptionsSchema = new mongoose.Schema({
  host: { type: String, required: true, unique: true },
  lastEventId: Number,
});

// Messages
const messagesSchema = new mongoose.Schema(
  {
    deletedAt: Date,
    prunedAt: Date,
    revokedAt: Date,
    timestamp: { type: Date, required: true },
    messageType: Number,
    fid: { type: Number, required: true },
    hash: { type: String, required: true, unique: true },
    hashScheme: Number,
    signature: { type: String, required: true },
    signatureScheme: Number,
    signer: { type: String, required: true },
    raw: { type: String, required: true },
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Casts
const castsSchema = new mongoose.Schema(
  {
    deletedAt: Date,
    timestamp: { type: Date, required: true },
    fid: { type: Number, required: true },
    hash: { type: String, required: true, unique: true },
    parentHash: String,
    parentFid: Number,
    parentUrl: String,
    text: { type: String },
    embeds: String,
    mentions: [Number],
    mentionsPositions: [Number],
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);
castsSchema.index({ hash: 1, deletedAt: 1 });
castsSchema.index({ parentHash: 1, deletedAt: 1 });
castsSchema.index({ hash: "text", fid: 1, deletedAt: 1 });
castsSchema.index({ fid: 1, hash: 1, deletedAt: 1 });

const reactionsSchema = new mongoose.Schema(
  {
    deletedAt: Date,
    timestamp: { type: Date, required: true },
    reactionType: Number,
    fid: { type: Number, required: true },
    hash: { type: String, required: true, unique: true },
    targetHash: String,
    targetFid: Number,
    targetUrl: String,
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reactionsSchema.index({ targetHash: 1, deletedAt: 1 });
reactionsSchema.index({ targetHash: 1, reactionType: 1, deletedAt: 1 });

const signersSchema = new mongoose.Schema(
  {
    deletedAt: Date,
    timestamp: { type: Date, required: true },
    fid: { type: Number, required: true },
    hash: { type: String, required: true, unique: true },
    custodyAddress: { type: String, required: true },
    signer: { type: String, required: true },
    name: String,
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const verificationsSchema = new mongoose.Schema(
  {
    deletedAt: Date,
    timestamp: { type: Date, required: true },
    fid: { type: Number, required: true },
    hash: { type: String, required: true, unique: true },
    claim: { type: String, required: true },
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const userDataSchema = new mongoose.Schema(
  {
    deletedAt: Date,
    timestamp: { type: Date, required: true },
    fid: { type: Number, required: true },
    hash: { type: String, required: true, unique: true },
    type: { type: Number, required: true },
    value: { type: String, required: true },
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userDataSchema.index({ fid: 1, deletedAt: 1 });
userDataSchema.index({ value: 1, type: 1, deletedAt: 1 });

const fidsSchema = new mongoose.Schema(
  {
    fid: { type: Number, required: true, unique: true },
    custodyAddress: { type: String, required: true },
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);

fidsSchema.index({ fid: 1, deletedAt: 1 });

const fnamesSchema = new mongoose.Schema(
  {
    fname: { type: String, required: true, unique: true },
    custodyAddress: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);

fnamesSchema.index({ custodyAddress: 1, deletedAt: 1 });

const linksSchema = new mongoose.Schema(
  {
    fid: { type: Number, required: true },
    targetFid: { type: Number, required: true },
    hash: { type: String, required: true, unique: true },
    timestamp: { type: Date, required: true },
    deletedAt: Date,
    type: { type: String, required: true },
    displayTimestamp: Date,
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);

linksSchema.index({ fid: 1, type: 1, deletedAt: 1 });
linksSchema.index({ targetFid: 1, type: 1, deletedAt: 1 });

module.exports = {
  hubSubscriptionsSchema,
  messagesSchema,
  castsSchema,
  reactionsSchema,
  signersSchema,
  verificationsSchema,
  userDataSchema,
  fidsSchema,
  fnamesSchema,
  linksSchema,
};
