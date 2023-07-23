const { Service: _CacheService } = require("../services/cache/CacheService");
const { generateChallenge } = require("../helpers/generate-challenge");
const fido2 = require("fido2-lib");
const base64url = require("base64url");

class AccountRecovererService {
  _bufferToAB(buf) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
      view[i] = buf[i];
    }
    return ab;
  }
  async _verifyAttestationResponse({ signature, challenge }) {
    try {
      const body = JSON.parse(signature);
      const clientDataJSON = body.response.clientDataJSON;
      const attestationObject = body.response.attestationObject;
      const idArrayBuffer = this.bufferToAB(base64url.toBuffer(body.id));
      const { id, type } = body;

      /** step1: verify with address */
      if (type !== "public-key") {
        throw new Error("Invalid PassKey type");
      }

      const f2l = new fido2.Fido2Lib({
        timeout: 60000,
        challengeSize: 52,
        rpId: process.env.NODE_ENV === "production" ? "beb.quest" : "localhost",
        rpName: "beb.quest", // replace with your application's name
      });
      const attestationExpectations = {
        challenge,
        origin:
          process.env.NODE_ENV === "production"
            ? "https://beb.quest"
            : "http://localhost:5678",
        factor: "either",
      };

      /** step2: verify with Fido2Lib the attestation is valid */
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
      return { ...authnResult, id };
    } catch (e) {
      console.log(e);
      throw new Error("Could not parse PassKey signature");
    }
  }
  /**
   * Add a Passkey recoverer to an account
   * @param {Account} account
   * @returns Promise<AccountRecoverer>
   */
  async _addPasskeyRecoverer(account, { signature }) {
    const CacheService = new _CacheService();
    const initialChallenge = await CacheService.get({
      key: "ChallengeForRecoverer",
      params: {
        accountId: account._id,
        type: "PASSKEY",
      },
    });
    if (!initialChallenge) throw new Error("No challenge found");
    const authnResult = await this._verifyAttestationResponse({
      signature,
      challenge: initialChallenge,
    });
    const pubKey = authnResult.authnrData.get("credentialPublicKeyPem");
    const counter = authnResult.authnrData.get("counter");
    const passkeyId = authnResult.authnrData.get("id");
    // create a new challenge for subsequent recoverer login. Should expire in 7 days.
    const challenge = {
      challenge: generateChallenge(),
    };
    return {
      type: "PASSKEY",
      id: passkeyId,
      pubKey,
      counter,
      challenge,
    };
  }
  /**
   * Generate a short lived challenge in cache, which is used to initiate the recoverer
   * @param {Account} account
   * @returns Promise<String> challenge
   */
  async requestInitialChallengeForRecoverer(account, { type }) {
    if (!account) throw new Error("Account not found");
    // only support passkey for now
    if (type !== "PASSKEY") throw new Error("Invalid recoverer type");
    const CacheService = new _CacheService();
    // 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const challenge = generateChallenge();
    await CacheService.set({
      key: "ChallengeForRecoverer",
      params: {
        accountId: account._id,
        type,
      },
      value: challenge,
      expiresAt,
    });
    return challenge;
  }

  /**
   * Add a recoverer to an account
   * @param {Account} account
   * @returns Promise<Account>
   */
  async addRecoverer(account, { signature, type }) {
    if (!account) throw new Error("Account not found");
    // only support passkey for now
    if (type !== "PASSKEY") throw new Error("Invalid recoverer type");
    try {
      const recoverer = await this._addPasskeyRecoverer(account, { signature });
      if (account.recoverers) {
        account.recoverers.push(recoverer);
      } else {
        account.recoverers = [recoverer];
      }
      const updatedAccount = await account.save();
      return updatedAccount;
    } catch (e) {
      console.log(e);
      throw new Error("Could not add recoverer: " + e.message);
    }
  }
}

module.exports = { Service: AccountRecovererService };
