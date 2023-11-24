const mongoose = require("mongoose");

// HubSubscriptions
const hubSubscriptionsSchema = new mongoose.Schema({
  host: { type: String, required: true, unique: true },
  lastEventId: Number,
  lastBackfillFid: Number,
});
hubSubscriptionsSchema.index({ lastEventId: 1 });
hubSubscriptionsSchema.index({ lastBackfillFid: 1 });
hubSubscriptionsSchema.index({ host: 1 });

// Messages
const messagesSchema = new mongoose.Schema(
  {
    deletedAt: Date,
    prunedAt: Date,
    revokedAt: Date,
    timestamp: { type: Date, required: true },
    messageType: Number,
    fid: { type: String, required: true },
    hash: { type: String, required: true, unique: true },
    hashScheme: Number,
    signature: { type: String, required: true },
    signatureScheme: Number,
    signer: { type: String, required: true },
    raw: { type: String, required: true },
    external: { type: Boolean, default: false },
    unindexed: { type: Boolean, default: false },
    bodyOverrides: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);
messagesSchema.index({ unindexed: 1 });
messagesSchema.index({ external: 1, unindexed: 1 });

// Casts
const castsSchema = new mongoose.Schema(
  {
    deletedAt: Date,
    timestamp: { type: Date, required: true },
    fid: { type: String, required: true },
    hash: { type: String, required: true, unique: true },
    parentHash: String,
    parentFid: String,
    parentUrl: String,
    text: { type: String },
    embeds: String,
    mentions: [String],
    mentionsPositions: [Number],
    external: { type: Boolean, default: false },
    threadHash: { type: String },
    globalScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);
castsSchema.index({ hash: 1, deletedAt: 1 });
castsSchema.index({ parentHash: 1, deletedAt: 1 });
castsSchema.index({ hash: "text", fid: 1, deletedAt: 1 });
castsSchema.index({ fid: 1, hash: 1, deletedAt: 1 });
castsSchema.index({ fid: 1, deletedAt: 1, timestamp: -1 });
castsSchema.index({ mentions: 1, fid: 1, deletedAt: 1, timestamp: -1 });
castsSchema.index({ fid: 1, deletedAt: 1 });
castsSchema.index({ threadHash: 1, deletedAt: 1 });
castsSchema.index({ globalScore: -1, deletedAt: 1, timestamp: -1 });
castsSchema.index({ text: "text", deletedAt: 1, timestamp: -1 });
castsSchema.index({
  parentUrl: 1,
  deletedAt: 1,
  timestamp: -1,
  globalScore: 1,
});

const reactionsSchema = new mongoose.Schema(
  {
    deletedAt: Date,
    timestamp: { type: Date, required: true },
    reactionType: Number,
    fid: { type: String, required: true },
    hash: { type: String, required: true, unique: true },
    targetHash: String,
    targetFid: String,
    targetUrl: String,
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reactionsSchema.index({ targetHash: 1, deletedAt: 1 });
reactionsSchema.index({ targetHash: 1, reactionType: 1, deletedAt: 1 });
reactionsSchema.index({ targetFid: 1, reactionType: 1, deletedAt: 1 });
reactionsSchema.index({ targetFid: 1, fid: 1, reactionType: 1, deletedAt: 1 });

const signersSchema = new mongoose.Schema(
  {
    deletedAt: Date,
    timestamp: { type: Date, required: true },
    fid: { type: String, required: true },
    hash: { type: String, required: true, unique: true },
    custodyAddress: { type: String, required: true },
    signer: { type: String, required: true },
    name: String,
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);
signersSchema.index({ fid: 1, signer: 1 });

const verificationsSchema = new mongoose.Schema(
  {
    deletedAt: Date,
    timestamp: { type: Date, required: true },
    fid: { type: String, required: true },
    hash: { type: String, required: true, unique: true },
    claim: { type: String, required: true },
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);
verificationsSchema.index({ fid: 1, claim: "text" });
verificationsSchema.index({ claim: "text", deletedAt: 1 });
verificationsSchema.index({ fid: 1, deletedAt: 1 });
verificationsSchema.index({ deletedAt: 1 });

const userDataSchema = new mongoose.Schema(
  {
    deletedAt: Date,
    timestamp: { type: Date, required: true },
    fid: { type: String, required: true },
    hash: { type: String, required: true, unique: true },
    type: { type: Number, required: true },
    value: { type: String, required: true },
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userDataSchema.index({ fid: 1, type: 1 });
userDataSchema.index({ fid: 1, deletedAt: 1 });
userDataSchema.index({ value: "text", type: 1, deletedAt: 1 });

const fidsSchema = new mongoose.Schema(
  {
    fid: { type: String, required: true, unique: true },
    custodyAddress: { type: String, required: true },
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);
fidsSchema.index({ fid: 1 });
fidsSchema.index({ fid: 1, deletedAt: 1 });
fidsSchema.index({ custodyAddress: 1, deletedAt: 1 });

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
    fid: { type: String, required: true },
    targetFid: { type: String, required: true },
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
linksSchema.index({ fid: 1, targetFid: 1, type: 1 });
linksSchema.index({ fid: 1, targetFid: 1, type: 1, deletedAt: 1 });

const storageSchema = new mongoose.Schema(
  {
    deletedAt: Date,
    timestamp: { type: Date, required: true },
    fid: { type: String, required: true },
    units: { type: Number, required: true },
    expiry: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);
storageSchema.index({ fid: 1, deletedAt: 1 });

const notificationsSchema = new mongoose.Schema(
  {
    // Timestamp when the notification was generated
    timestamp: { type: Date, required: true },

    // Type of the notification (follow, reaction, reply, etc.)
    notificationType: { type: String, required: true },

    // FID (Foreign ID) of the user who generated the notification
    fromFid: { type: String, required: true },

    // FID of the user who will receive the notification
    toFid: { type: String, required: true },

    // Optional additional data relevant to the notification
    payload: { type: mongoose.Schema.Types.Mixed },

    // Flag to mark if the notification was deleted
    deletedAt: Date,

    // Flag to mark if the notification is external
    external: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for faster queries
notificationsSchema.index({ toFid: 1, notificationType: 1, deletedAt: 1 });
notificationsSchema.index({ fromFid: 1, notificationType: 1, deletedAt: 1 });
notificationsSchema.index({ "payload.linkHash": 1 });
notificationsSchema.index({ "payload.castHash": 1 });

const offerSchema = new mongoose.Schema(
  {
    buyerAddress: { type: String, required: true },
    fid: { type: Number, required: true },
    deadline: { type: String, required: true },
    canceledAt: { type: Date },
    txHash: { type: String },
    amount: { type: String, required: true },
  },
  { timestamps: true }
);

offerSchema.index({ buyerAddress: 1, canceledAt: 1 });
offerSchema.index({ buyerAddress: 1, fid: 1 });
offerSchema.index({ buyerAddress: 1, fid: 1, canceledAt: 1 });
offerSchema.index({ fid: 1, canceledAt: 1 });
offerSchema.index({ txHash: 1 });
offerSchema.index({ canceledAt: 1 });

const listingSchema = new mongoose.Schema(
  {
    ownerAddress: { type: String, required: true },
    fid: { type: Number, required: true },
    minFee: { type: String, required: true },
    deadline: { type: Number, required: true },
    txHash: { type: String },
    canceledAt: { type: Date },
  },
  { timestamps: true }
);

listingSchema.index({ ownerAddress: 1, canceledAt: 1 });
listingSchema.index({ fid: 1, canceledAt: 1 });
listingSchema.index({ canceledAt: 1 });
listingSchema.index({ fid: 1, canceledAt: 1, txHash: 1 });
listingSchema.index({ fid: 1, txHash: 1 });
listingSchema.index({ fid: 1, boughtAt: 1 });
listingSchema.index({ fid: 1, deadline: 1, canceledAt: 1 });
listingSchema.index({ fid: 1, boughtAt: 1, canceledAt: 1 });
listingSchema.index({ fid: 1, boughtAt: 1, canceledAt: 1, createdAt: 1 });
listingSchema.index({ canceledAt: 1, createdAt: 1, deadline: 1 });
listingSchema.index({ canceledAt: 1, boughtAt: 1, deadline: 1, fid: 1 });
listingSchema.index({ canceledAt: 1, boughtAt: 1, deadline: 1, fid: 1, id: 1 });

listingSchema.post("find", function (docs) {
  for (let doc of docs) {
    doc.minFee = doc.minFee.replace(/^0+/, ""); // This will remove all leading zeros
  }
});

listingSchema.post("findOne", function (doc) {
  if (doc) {
    doc.minFee = doc.minFee.replace(/^0+/, ""); // This will remove all leading zeros
  }
});

const listingLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        "Listed",
        "Bought",
        "Canceled",
        "OfferMade",
        "OfferCanceled",
        "OfferApproved",
      ],
    }, // "Listed" or "Bought"
    fid: { type: Number, required: true },
    from: { type: String }, // initiator of the event
    txHash: { type: String },
    price: {
      type: String,
    },
  },
  { timestamps: true }
);

listingLogSchema.index({
  txHash: 1,
});

listingLogSchema.index({
  fid: 1,
});

listingLogSchema.index({
  from: 1,
  eventType: 1,
});
listingLogSchema.index({
  eventType: 1,
});

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
  notificationsSchema,
  offerSchema,
  listingSchema,
  storageSchema,
  listingLogSchema,
};
