import mongoose from "mongoose";
import { AddressNonceSchema } from "../schema/main.js";
import { bufferToHex } from "ethereumjs-util";
import { recoverPersonalSignature } from "@metamask/eth-sig-util";
import { getRandomUint256 } from "../helpers/random.js";
import crypto from "crypto";

class AddressNonceClass extends mongoose.Model {
  async getMessageToSign() {
    const msg = `This BEB Dimension wants you to sign in with your Ethereum account, secured with a signed message:\n ${this.nonce.length} ${this.nonce}`;
    return msg;
  }

  async decodeAddressBySignature(signature: string) {
    const msg = await this.getMessageToSign();
    const msgBufferHex = bufferToHex(Buffer.from(msg, "utf8"));
    const address = recoverPersonalSignature({
      data: msgBufferHex,
      signature,
    });
    return address;
  }

  static async generateNewTransactionNonceByAccountId(addressId: string) {
    const addressNonce = await this.findOne({ address: addressId });
    if (!addressNonce) throw new Error("Invalid address nonce");
    addressNonce.generateNewTransactionNonce();
    return addressNonce;
  }

  /** generate a new account nonce */
  async generateNewNonce() {
    this.nonce = `${crypto.randomInt(1, 1_000_000)}`;
    await this.save();
  }

  /** generate a new account transaction nonce */
  async generateNewTransactionNonce() {
    this.transactionNonce = `${getRandomUint256()}`;
    await this.save();
  }
}

AddressNonceSchema.loadClass(AddressNonceClass);

export const AddressNonce =
  mongoose.models.AddressNonce ||
  mongoose.model("AddressNonce", AddressNonceSchema);
