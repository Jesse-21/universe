const { Magic } = require("@magic-sdk/admin");
const fido2 = require("fido2-lib");
const { bufferToHex } = require("ethereumjs-util");
const { recoverPersonalSignature } = require("@metamask/eth-sig-util");
const base64url = require("base64url");
const mongoose = require("mongoose");
const axios = require("axios").default;
const { Account } = require("../models/Account");
const { AccountAddress } = require("../models/AccountAddress");
const { AccountCommunity } = require("../models/AccountCommunity");
const { AccountNonce } = require("../models/AccountNonce");
const { getCustodyAddress, getCurrentUser } = require("../helpers/warpcast");
const { getFidByCustodyAddress } = require("../helpers/farcaster");
const {
  Service: _AccountRecovererService,
} = require("./AccountRecovererService");
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
  async _generateNonceAndAccessToken({ account, extra = {} }) {
    if (!account) throw new Error("Account not found");
    const accountNonce = await AccountNonce.findOne({
      account: account._id,
    });

    /** step1: generate new nonce for the user */
    await accountNonce.generateNewNonce();
    /** step2: generate a jwt token and pass over to the client */
    const accessToken = await generateNewAccessTokenFromAccount(account, extra);
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
   * Get a wallet account's message to sign with nonce
   * @returns Promise<encyrptedWalletJson: String, message: String>
   */
  async getWalletAccountMessageToSign({ walletEmail }) {
    const account = await Account.findOne({
      walletEmail,
    });
    if (!account) {
      return {
        message: "Account not found",
        encyrptedWalletJson: null,
      };
    }
    if (account.deleted) throw new Error("Account is deleted");

    const accountNonce = await AccountNonce.findOne({ account: account._id });

    if (!accountNonce) throw new Error("AccountNonce not found");

    const msg = accountNonce.getMessageToSign();
    return {
      message: msg,
      encyrptedWalletJson: account.encyrptedWalletJson,
    };
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
   * Authenticate an account with warpcast
   * @returns Promise<Account>
   */
  async authByWarpcast({ address, token, chainId }) {
    /** step1: get custody address. If this fails it means the token is invalid. */
    try {
      let tries = 0;
      let signerData;

      while (tries < 60) {
        tries += 1;
        await new Promise((r) => setTimeout(r, 1000));

        const { data } = await axios.get(
          `https://api.warpcast.com/v2/signed-key-request`,
          {
            params: {
              token: token,
            },
          }
        );

        const signerRequest = data.result.signedKeyRequest;

        if (signerRequest.state === "completed") {
          signerData = signerRequest;
          break;
        }
      }
      if (tries >= 60) throw new Error("Timeout");
      const fid = signerData.userFid.toString();

      // successfully got the signer request
      const { custodyAddress } = await getCustodyAddress({
        fid,
        token: process.env.FARQUEST_FARCASTER_APP_TOKEN,
      });

      const account = await Account.findOrCreateByAddressAndChainId({
        address: custodyAddress,
        chainId,
      });

      if (account?.deleted) throw new Error("Account is deleted");
      const existingRecoverer = account.recoverers?.find?.((r) => {
        return r.type === "FARCASTER_SIGNER" && r.pubKey === address;
      });
      if (existingRecoverer) {
        return account;
      }

      const RecovererService = new _AccountRecovererService();
      const updatedAccount = await RecovererService.addRecoverer(account, {
        type: "FARCASTER_SIGNER",
        address,
        id: fid,
      });
      return updatedAccount;
    } catch (e) {
      console.log(e);
      throw new Error("Invalid token");
    }
  }

  /**
   * Authenticate an account with warpcast
   * @returns Promise<Account>
   */
  async authByFid({
    address: custodyAddress,
    id: signerAddress,
    chainId,
    signature,
  }) {
    try {
      /** step1: verify the user has a verified sigature from custodyAddress */
      const { account } = await this.verifySignature({
        address: custodyAddress,
        chainId,
        signature,
      });

      if (account?.deleted) throw new Error("Account is deleted");

      /** step2: If already cached the recoverer/signer then return account */
      const existingRecoverer = account.recoverers?.find?.((r) => {
        return r.type === "FARCASTER_SIGNER" && r.pubKey === signerAddress;
      });
      if (existingRecoverer) {
        return account;
      } else {
        // step3: if no existing recoverer/signer then check if it exists in key registry
        const RecovererService = new _AccountRecovererService();
        const fid = await RecovererService.verifyFarcasterSignerAndGetFid(
          account,
          {
            signerAddress,
            custodyAddress,
          }
        );
        if (!fid) {
          // the signer has not been added to key registry
          throw new Error(
            "Invalid signer! If this error persists, try logging out and logging in again."
          );
        }
        // step4: if valid signer then add to account
        const updatedAccount = await RecovererService.addRecoverer(account, {
          type: "FARCASTER_SIGNER",
          address: signerAddress,
          id: fid,
        });
        return updatedAccount;
      }
    } catch (e) {
      console.log(e);
      throw new Error("Invalid token");
    }
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
   * Authenticate an account
   * @returns Promise<Account, AccountNonce, AccessTokenString>
   */
  async authenticate({ address, chainId, signature, type = "SIGNATURE", id }) {
    let account = null;
    let isExternal = true; // non farcaster user
    if (type === "PASSKEY") {
      account = await this.authByPassKey({
        signature,
        email: address,
        chainId,
      });
    } else if (type === "WARPCAST") {
      account = await this.authByWarpcast({
        address,
        token: signature,
        fid: id,
        chainId,
      });
      isExternal = false;
    } else if (type === "FID") {
      account = await this.authByFid({
        address,
        signature,
        id,
        chainId,
      });
      isExternal = false;
    } else {
      /** step1: authenticate with correct provider */
      // @TODO use type instead
      if (address == "0x0magiclink") {
        account = await this.authByEmail({ address, chainId, signature });
      } else {
        account = await this.authBySignature({ address, chainId, signature });
      }
    }

    /** step3: regenerate nonce and access token */
    return this._generateNonceAndAccessToken({
      account,
      extra: { isExternal },
    });
  }

  /**
   * Used for first time user tries to create an account with encrypted json
   * @returns Promise<Account, AccessTokenString,AccountNonce>
   */
  async authByEncryptedWalletJson({
    email,
    encyrptedWalletJson,
    chainId,
    signature,
  }) {
    const existing = await Account.findOne({
      walletEmail: email,
    });
    const parsedJson = JSON.parse(encyrptedWalletJson);
    const address = "0x" + parsedJson.address;
    let account;
    if (existing) {
      // authenticate with signature
      account = await this.authBySignature({ address, chainId, signature });
    } else {
      // first time authenticating, create account
      // don't need nonce because only the first time works
      /** step1: decrypt message to make sure it is from account */
      const msg = encyrptedWalletJson;
      const msgBufferHex = bufferToHex(Buffer.from(msg, "utf8"));
      const verifyAgainstAddress = recoverPersonalSignature({
        data: msgBufferHex,
        signature,
      });

      if (verifyAgainstAddress.toLowerCase() !== address.toLowerCase())
        throw new Error("Unauthorized");

      /** step2: Create an account */
      account = await Account.createFromEncryptedWalletJson({
        email,
        encyrptedWalletJson,
        chainId,
      });
    }

    /** step3: regenerate nonce and access token */
    return this._generateNonceAndAccessToken({ account });
  }
}

module.exports = { Service: AuthService };
