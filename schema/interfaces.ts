import { Types } from "mongoose";

export interface IChain {
  _id: string;
  chainId: number;
  name: string;
}

export interface INonce {
  _id: string;
  nonce: string;
  transactionNonce: string;
  address: Types.ObjectId;
}

export interface IAddress {
  _id: string;
  address: string;
  chain?: IChain;
  nonce?: INonce;
}

export interface ILink {
  _id: string;
  url?: string;
  image?: string;
  title?: string;
  description?: string;
  logo?: string;
  iframe?: string;
}

export interface IKeyValueFields {
  _id: string;
  key: string;
  value?: string;
}

export interface IContent {
  _id: string;
  raw?: string;
  json?: string;
  html?: string;
}

export interface IImage {
  _id: string;
  src?: string;
  name?: string;
  isVerified?: boolean;
  verificationOrigin?: string;
  verificationTokenId?: string;
  verificationContractAddress?: string;
  verificationExternalUrl?: string;
}

export interface IRichEmbed {
  _id: string;
  description?: IContent;
  title?: string;
  createdAt?: Date;
  updatedAt?: Date;
  image?: IImage;
  thumbnail?: IImage;
  color?: string;
  url?: string;
  fields?: IKeyValueFields[];
}

enum BlockType {
  IMAGE = "IMAGE",
  LINK = "LINK",
  RICH_EMBED = "RICH_EMBED",
  COLLECTION = "COLLECTION",
  MESSAGE = "MESSAGE",
}
export interface IRichContentBlock {
  _id: string;
  blockType: BlockType;
  blockId: Types.ObjectId;
}

export interface IPermission {
  _id: string;
  description?: IContent;
  name: string;
  dimension: Types.ObjectId;
  uniqueIdentifier: string;
  editable: boolean;
  bitwiseFlag: string;
  bitwisePosition: number;
}

export interface IPermissionOverwrite {
  _id: string;
  objectTypeId: Types.ObjectId;
  objectType: number;
  allowedPermissionString: string;
  deniedPermissionString: string;
}

export interface IRichContent {
  _id: string;
  content?: IContent;
  blocks?: IRichContentBlock[];
}

export interface IChannel {
  _id: string;
  description?: IContent;
  name: string;
  slug: string;
  dimension: Types.ObjectId;
  recipients: Types.ObjectId[];
  createdBy: Types.ObjectId;
  icon?: Types.ObjectId;
  permissionsOverwrite: Types.ObjectId[];
  isHidden: boolean;
}

export interface IDimension {
  _id: string;
  name: string;
  bio?: IContent;
  image?: Types.ObjectId;
  bannerImage?: Types.ObjectId;
  domain?: string;
  tld?: string;
  owner?: Types.ObjectId;
  permissions?: Types.ObjectId[];
  roles?: Types.ObjectId[];
  channels?: Types.ObjectId[];
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRole {
  _id: string;
  description?: IContent;
  name: string;
  slug: string;
  dimension: Types.ObjectId;
  icon?: Types.ObjectId;
  editable: boolean;
  color?: string;
  permissionString?: string;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAddressDimensionRole {
  _id: string;
  role: Types.ObjectId;
  accountDimension: Types.ObjectId;
  isValid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAccountDimension {
  _id: string;
  address: Types.ObjectId;
  dimension: Types.ObjectId;
  roles: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IChannelRecipient {
  _id: string;
  recipientId: Types.ObjectId;
  recipientType: number;
  slug: string;
  channel: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  _id: string;
  richContent: IRichContent;
  account: Types.ObjectId;
  externalId: string;
  parent: Types.ObjectId;
  root: Types.ObjectId;
  dimension: Types.ObjectId;
  channel: Types.ObjectId;
  replies: Types.ObjectId[];
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}
