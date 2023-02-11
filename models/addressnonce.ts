import mongoose from "mongoose";
import { AddressNonceSchema } from "../schema/main.js";
import { bufferToHex } from "ethereumjs-util";
import { recoverPersonalSignature } from "@metamask/eth-sig-util";
import { INonce } from "../schema/interfaces.js";
import crypto from "crypto";

type IAddressNonceModel = mongoose.Model<INonce>;
interface IAddressNonce extends INonce {
  getMessageToSign: () => string;
  decodeAddressBySignature: (signature: string) => string;
  generateNewNonce: () => Promise<void>;
}

class AddressNonceClass extends mongoose.Model {
  getMessageToSign() {
    const msg = `This BEB Dimension wants you to sign in with your Ethereum account, secured with a signed message:\n ${this.nonce.length} ${this.nonce}`;
    return msg;
  }

  decodeAddressBySignature(signature: string) {
    const msg = this.getMessageToSign();
    const msgBufferHex = bufferToHex(Buffer.from(msg, "utf8"));
    const address = recoverPersonalSignature({
      data: msgBufferHex,
      signature,
    });
    return address;
  }

  async generateNewNonce() {
    this.nonce = `${crypto.randomInt(1, 1_000_000)}`;
    await this.save();
  }
}

AddressNonceSchema.loadClass(AddressNonceClass);

export const AddressNonce = mongoose.model<IAddressNonce, IAddressNonceModel>(
  "AddressNonce",
  AddressNonceSchema
);
