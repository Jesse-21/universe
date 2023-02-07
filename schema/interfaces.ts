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
