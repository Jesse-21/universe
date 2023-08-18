const mongoose = require("mongoose");

// HubSubscriptions
const hubSubscriptionsSchema = new mongoose.Schema({
  host: { type: String, required: true, unique: true },
  last_event_id: Number,
});

// Messages
const messagesSchema = new mongoose.Schema({
  id: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
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
});

// Casts
const castsSchema = new mongoose.Schema({
  id: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date,
  timestamp: { type: Date, required: true },
  fid: { type: Number, required: true },
  hash: { type: String, required: true, unique: true },
  parentHash: String,
  parentFid: Number,
  parentUrl: String,
  text: { type: String, required: true },
  embeds: String,
  mentions: [Number],
  mentionsPositions: [Number],
});

// MessagesMetadata
const messagesMetadataSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true },
  meta: String,
  mentions: [Number],
  mentionsPositions: [Number],
  relays: [String],
  encodes: String,
  encodesPositions: [Number],
});

// MessagesReactions
const messagesReactionsSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true },
  reactions: String,
  authors: [String],
});

// Relays
const relaysSchema = new mongoose.Schema({
  id: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date,
  timestamp: { type: Date, required: true },
  fid: { type: Number, required: true },
  hash: { type: String, required: true, unique: true },
  text: { type: String, required: true },
  embeds: String,
  mentions: [Number],
  mentionsPositions: [Number],
});

// CastsMetadata
const castsMetadataSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true },
  meta: String,
  mentions: [Number],
  mentionsPositions: [Number],
  relays: [String],
  encodes: String,
  encodesPositions: [Number],
});

// CastsReactions
const castsReactionsSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true },
  reactions: String,
  authors: [String],
});

// RelaysMetadata
const relaysMetadataSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true },
  meta: String,
  mentions: [Number],
  mentionsPositions: [Number],
  encodes: String,
  encodesPositions: [Number],
});

// RelaysReactions
const relaysReactionsSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true },
  reactions: String,
  authors: [String],
});

module.exports = {
  hubSubscriptionsSchema,
  messagesSchema,
  castsSchema,
  messagesMetadataSchema,
  messagesReactionsSchema,
  relaysSchema,
  castsMetadataSchema,
  castsReactionsSchema,
  relaysMetadataSchema,
  relaysReactionsSchema,
};
