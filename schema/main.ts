import mongoose from "mongoose";
import crypto from "crypto";
import { ethers } from "ethers";

import {
  IAddress,
  INonce,
  IChain,
  IKeyValueFields,
  IContent,
  IImage,
  IRichEmbed,
  IRichContent,
  IPermission,
  IPermissionOverwrite,
  IChannel,
  IRole,
  IDimension,
  IRichContentBlock,
  IAddressDimensionRole,
  IAddressDimension,
  IMessage,
  IChannelRecipient,
} from "./interfaces";

export const ChainSchema = new mongoose.Schema<IChain>({
  chainId: { type: Number },
  name: { type: String },
});

export const AddressNonceSchema = new mongoose.Schema<INonce>(
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

export const AddressSchema = new mongoose.Schema<IAddress>({
  address: { type: String, index: true, required: true },
  chain: ChainSchema,
  nonce: AddressNonceSchema,
});

export const LinkSchema = new mongoose.Schema({
  url: { type: String, index: true },
  image: { type: String },
  title: { type: String },
  description: { type: String },
  logo: { type: String },
  iframe: { type: String },
});

export const KeyValueFieldsSchema = new mongoose.Schema<IKeyValueFields>({
  key: { type: String, required: true, index: true },
  value: { type: String },
});

export const ContentSchema = new mongoose.Schema<IContent>({
  raw: { type: String },
  json: { type: String },
  html: { type: String },
});

export const ImageSchema = new mongoose.Schema<IImage>({
  src: { type: String },
  name: { type: String },
  isVerified: { type: Boolean, default: false },
  verificationOrigin: { type: String },
  verificationTokenId: { type: String },
  verificationContractAddress: { type: String },
  verificationExternalUrl: { type: String },
});

export const RichEmbedSchema = new mongoose.Schema<IRichEmbed>(
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

export const RichContentBlockSchema = new mongoose.Schema<IRichContentBlock>({
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

export const PermissionSchema = new mongoose.Schema<IPermission>(
  {
    description: ContentSchema,
    name: { type: String, required: true },
    dimension: {
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

export const PermissionOverwriteSchema =
  new mongoose.Schema<IPermissionOverwrite>(
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

export const RichContentSchema = new mongoose.Schema<IRichContent>({
  content: ContentSchema,
  blocks: [RichContentBlockSchema],
});

export const ChannelSchema = new mongoose.Schema<IChannel>(
  {
    description: ContentSchema,
    name: { type: String, required: true },
    slug: { type: String, index: true },
    dimension: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Dimension",
    },
    recipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        ref: "ChannelRecipient",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Address",
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

export const DimensionSchema = new mongoose.Schema<IDimension>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    bio: {
      type: ContentSchema,
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
    },
    bannerImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
    },
    domain: {
      type: String,
      index: true,
    },
    tld: {
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

export const RoleSchema = new mongoose.Schema<IRole>(
  {
    description: ContentSchema,
    name: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    dimension: {
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
    permissionString: { type: String },
    isHidden: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const AddressDimensionRoleSchema =
  new mongoose.Schema<IAddressDimensionRole>(
    {
      role: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        ref: "Role",
        required: true,
      },
      addressDimension: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        ref: "AddressDimension",
        required: true,
      },
      isValid: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
  );

export const AddressDimensionSchema = new mongoose.Schema<IAddressDimension>(
  {
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      index: true,
    },
    dimension: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dimension",
      index: true,
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AddressDimensionRole",
        index: true,
      },
    ],
  },
  { timestamps: true }
);

export const ChannelRecipientSchema = new mongoose.Schema<IChannelRecipient>(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      required: true,
    },
    recipientType: { type: Number, index: true, required: true },
    slug: { type: String, index: true, required: true },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      index: true,
      required: true,
    },
  },
  { timestamps: true }
);

export const MessageSchema = new mongoose.Schema<IMessage>(
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
