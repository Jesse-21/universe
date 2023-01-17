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

export const RichContentBlockSchema = mongoose.Schema({
  blockType: {
    type: String,
    enum: ["IMAGE", "LINK", "RICH_EMBED", "COLLECTION", "MESSAGE"],
    index: true,
  },
  blockId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
});

export const PermissionSchema = mongoose.Schema(
  {
    description: ContentSchema,
    name: { type: String, required: true },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Dimension",
    },
    uniqueIdentifier: { type: String, index: true },
    editable: { type: Boolean, default: false },
    bitwiseFlag: { type: String, required: true, index: true },
    bitwisePosition: { type: Number, required: true, index: true },
  },
  { timestamps: true }
);

export const PermissionOverwriteSchema = mongoose.Schema(
  {
    objectTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      required: true,
    },
    objectType: { type: Number, index: true, required: true },
    allowedPermissionString: { type: String },
    deniedPermissionString: { type: String },
  },
  { timestamps: true }
);

export const RichContentSchema = mongoose.Schema({
  content: ContentSchema,
  blocks: [RichContentBlockSchema],
});

export const ChannelSchema = mongoose.Schema(
  {
    description: ContentSchema,
    name: { type: String, required: true },
    slug: { type: String, index: true },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Dimension",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Address",
    },
    position: {
      type: Number,
      default: Number.MAX_SAFE_INTEGER,
    },
    icon: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Image",
    },
    permissionsOverwrite: [
      {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        ref: "PermissionOverwrite",
      },
    ],
    isHidden: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const DimensionSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    bio: {
      type: contentSchema,
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
    },
    bannerImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
    },
    bebdomain: {
      type: String,
      index: true,
    },
    host: {
      type: String,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
    },
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
        index: true,
      },
    ],
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
  },
  { timestamps: true }
);

export const RoleSchema = mongoose.Schema(
  {
    description: ContentSchema,
    name: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Dimension",
    },
    icon: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Image",
    },
    editable: { type: Boolean, default: false },
    color: { type: String },
    position: { type: Number },
    permissionString: { type: String },
    isHidden: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const AddressDimensionRoleSchema = mongoose.Schema(
  {
    role: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Role",
      required: true,
    },
    accountCommunity: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "AddressDimension",
      required: true,
    },
    isValid: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const AddressDimensionSchema = mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      index: true,
    },
    dimension: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dimension",
      index: true,
    },
    joined: {
      type: Boolean,
      default: false,
      index: true,
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AddressDimensionRole",
        index: true,
      },
    ],
    lastSeen: { type: Date, default: new Date(), index: true },
    joinedDate: { type: Date, default: new Date(), index: true },
  },
  { timestamps: true }
);

export const MessageSchema = mongoose.Schema(
  {
    richContent: RichContentSchema,
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      index: true,
      required: true,
    },
    externalId: { type: String, index: true },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      index: true,
    },
    root: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      index: true,
    },
    dimension: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dimension",
      index: true,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      index: true,
    },
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        index: true,
      },
    ],
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);
