import mongoose from "mongoose";
import crypto from "crypto";
import { ethers } from "ethers";

export const LinkSchema = mongoose.Schema({
  url: { type: String, index: true },
  image: { type: String },
  title: { type: String },
  description: { type: String },
  logo: { type: String },
  iframe: { type: String },
});

export const ChainSchema = mongoose.Schema({
  chainId: { type: Number },
  name: { type: String },
});

export const AddressNonceSchema = mongoose.Schema(
  {
    nonce: { type: String, default: `${crypto.randomInt(1, 10000)}` },
    transactionNonce: {
      type: String,
      default: `${ethers.BigNumber.from(crypto.randomBytes(32)).toString()}`,
    },
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      index: true,
    },
  },
  { timestamps: true }
);

export const AddressSchema = mongoose.Schema({
  address: { type: String, index: true, required: true },
  chain: ChainSchema,
  nonce: AddressNonceSchema,
});

export const KeyValueFieldsSchema = mongoose.Schema({
  key: { type: String, required: true, index: true },
  value: { type: String },
});

export const ContentSchema = mongoose.Schema({
  raw: { type: String },
  json: { type: String },
  html: { type: String },
});

export const ImageSchema = mongoose.Schema({
  src: { type: String },
  name: { type: String },
  isVerified: { type: Boolean, default: false },
  verificationOrigin: { type: String },
  verificationTokenId: { type: String },
  verificationChainId: { type: Number },
  verificationContractAddress: { type: String },
  verificationExternalUrl: { type: String },
});

export const RichEmbedSchema = mongoose.Schema(
  {
    description: ContentSchema,
    title: { type: String },
    timestamp: { type: Date },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Image",
    },
    thumbnail: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Image",
    },
    color: { type: String },
    url: { type: String },
    fields: [KeyValueFieldsSchema],
  },
  { timestamps: true }
);

const RichContentBlockSchema = mongoose.Schema({
  blockType: {
    type: String,
    enum: ["IMAGE", "LINK", "RICH_EMBED", "COLLECTION", "QUEST", "POST"],
    index: true,
  },
  blockId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
});
