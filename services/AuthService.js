const { Magic } = require("@magic-sdk/admin");
const fido2 = require("fido2-lib");
const base64url = require("base64url");
const mongoose = require("mongoose");

const { Account } = require("../models/Account");
const { AccountAddress } = require("../models/AccountAddress");
const { AccountCommunity } = require("../models/AccountCommunity");
const { AccountNonce } = require("../models/AccountNonce");

const { Service: _AccountService } = require("./AccountService");

const { generateNewAccessTokenFromAccount } = require("../helpers/jwt");

const bufferToAB = (buf) => {
  var ab = new ArrayBuffer(buf.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buf[i];
  }
  return ab;
};

class AuthService {
  /**
   * Generate a new account nonce and access token
   * @param {Account} account
   * @returns Promise<Account, AccountNonce, String>
   */
  async _generateNonceAndAccessToken({ account }) {
    if (!account) throw new Error("Account not found");
    const accountNonce = await AccountNonce.findOne({
      account: account._id,
    });

    /** step1: generate new nonce for the user */
    await accountNonce.generateNewNonce();
    /** step2: generate a jwt token and pass over to the client */
    const accessToken = await generateNewAccessTokenFromAccount(account);
    return { account, accountNonce, accessToken };
  }

  /**
   * Get an account's message to sign with nonce
   * @returns Promise<Account, AccountNonce>
   */
  async getMessageToSign({ address, chainId }) {
    const account = await Account.findOrCreateByAddressAndChainId({
      address,
      chainId,
    });
    if (!account) throw new Error("Account not found");
    if (account.deleted) throw new Error("Account is deleted");

    const accountNonce = await AccountNonce.findOne({ account: account._id });

    if (!accountNonce) throw new Error("AccountNonce not found");

    return accountNonce.getMessageToSign();
  }

  /**
   * Verify an account's signature with nonce
   * @returns Promise<Account, AccountNonce>
   */
  async verifySignature({ address, chainId, signature }) {
    const account = await Account.findByAddressAndChainId({ address, chainId });
    if (!account) throw new Error("Account not found");
    if (account.deleted) throw new Error("Account is deleted");

    const accountNonce = await AccountNonce.findOne({ account: account._id });
    const verifyAgainstAddress = await accountNonce.decodeAddressBySignature(
      signature
    );
    if (verifyAgainstAddress.toLowerCase() !== address.toLowerCase())
      throw new Error("Unauthorized");

    if (!accountNonce) throw new Error("AccountNonce not found");

    return { account, accountNonce };
  }

  /**
   * Authenticate an account with signature
   * @returns Promise<Account>
   */
  async authBySignature({ address, chainId, signature }) {
    /** step1: verify the user has a verified sigature */
    const { account } = await this.verifySignature({
      address,
      chainId,
      signature,
    });

    return account;
  }

  /**
   * Authenticate an account with magic link
   * @returns Promise<Account>
   */
  async authByEmail({ signature }) {
    /** step1: verify with magic link */
    let magic = new Magic(process.env.MAGIC_LINK_SECRET);
    await magic.token.validate(signature);
    const metadata = await magic.users.getMetadataByToken(signature);

    let account = await Account.findOne({ email: metadata.email });
    if (account?.deleted) throw new Error("Account is deleted");
    if (!account) {
      account = await Account.createFromAddress({
        address: metadata.publicAddress,
        chainId: 1,
        email: metadata.email,
      });
    }

    return account;
  }

  /**
   * Authenticate an account with PassKey
   * @returns Promise<Account>
   */
  async authByPassKey({ signature, email, chainId }) {
    try {
      /** step1: verify with address */
      let account = await Account.findOne({ email: email });
      if (account?.deleted) throw new Error("Account is deleted");
      if (account) {
        // @TODO add logic for existing account
        throw new Error("Account already exists");
      }

      /*
       * @TODO this part should be deprecated as we no longer support registering only with PassKey
       * use AccountRecovererService.addRecoverer instead
       */
      const body = JSON.parse(signature);
      const clientDataJSON = body.response.clientDataJSON;
      const attestationObject = body.response.attestationObject;
      const idArrayBuffer = bufferToAB(base64url.toBuffer(body.id));

      const { id, type } = body;

      /** step2: verify with address */
      if (type !== "public-key") {
        throw new Error("Invalid PassKey type");
      }

      const f2l = new fido2.Fido2Lib({
        timeout: 60000,
        challengeSize: 52,
        rpId: process.env.NODE_ENV === "production" ? "beb.lol" : "localhost",
        rpName: "beb.lol", // replace with your application's name
      });

      const attestationExpectations = {
        challenge: "Y2hhbGxlbmdlIGNoYWxsZW5nZSBjaGFsbGVuZ2UgY2hhbGxlbmdl",
        origin:
          process.env.NODE_ENV === "production"
            ? "https://beb.lol"
            : "http://localhost:5678",
        factor: "either",
      };

      /** step3: verify with Fido2Lib the attestation is valid */
      let authnResult = await f2l.attestationResult(
        {
          rawId: idArrayBuffer,
          id: idArrayBuffer,
          response: {
            ...body.response,
            attestationObject: attestationObject,
            clientDataJSON: clientDataJSON,
          },
        },
        attestationExpectations
      );

      /** step4: create account if not exist */
      account = await Account.createFromAddress({
        address: authnResult.authnrData.get("credentialPublicKeyPem"),
        chainId: chainId,
        email: email,
      });

      /** step5: save counter and passkey */
      const accountAddress = await AccountAddress.findOne({
        account: account._id,
      });
      accountAddress.counter = authnResult.authnrData.get("counter");
      accountAddress.passKeyId = id;
      await accountAddress.save();

      return account;
    } catch (e) {
      console.log(e);
      throw new Error("Could not parse PassKey signature");
    }
  }
  /**
   * Authenticate an account with encrypted wallet json and signature
   * @TODO we need to verify the validity of the email
   * @returns Promise<String>
   */
  async createOrGetSignatureFromEncryptedWalletJson({
    email,
    wallet,
    chainId,
  }) {
    try {
      const walletDecrypted = JSON.parse(wallet);
      const address = walletDecrypted.address;
      let account;
      const existing = await Account.findOne({
        walletEmail: email,
      });
      if (existing) {
        account = existing;
      } else {
        account = await Account.createFromAddress({
          address: address,
          chainId,
          walletEmail: email,
          encyrptedWalletJson: wallet,
        });
      }

      const accountNonce = await AccountNonce.findOne({
        account: account._id,
      });

      if (!accountNonce) throw new Error("AccountNonce not found");

      return accountNonce.getMessageToSign();
    } catch (e) {
      throw new Error("Could not authenticate with wallet");
    }
  }

  /**
   * Authenticate an account
   * @returns Promise<Account, AccountNonce, AccessTokenString>
   */
  async authenticate({ address, chainId, signature, type = "SIGNATURE" }) {
    let account = null;
    if (type === "PASSKEY") {
      account = await this.authByPassKey({
        signature,
        email: address,
        chainId,
      });
    } else {
      /** step1: authenticate with correct provider */
      // @TODO use type instead
      if (address == "0x0magiclink") {
        account = await this.authByEmail({ address, chainId, signature });
      } else {
        account = await this.authBySignature({ address, chainId, signature });
      }
    }

    /** step2: 'join' default community if account does not have one */
    if (process.env.DEFAULT_COMMUNITY_ID) {
      await AccountCommunity.findOrCreate({
        accountId: account._id,
        communityId: mongoose.Types.ObjectId(process.env.DEFAULT_COMMUNITY_ID),
        joined: true,
      });
    }

    /** step3: regenerate nonce and access token */
    return this._generateNonceAndAccessToken({ account });
  }
}

module.exports = { Service: AuthService };
