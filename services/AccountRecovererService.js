const { Service: _CacheService } = require("../services/cache/CacheService");
const { generateChallenge } = require("../helpers/generate-challenge");
const fido2 = require("fido2-lib");
const base64url = require("base64url");
const ethers = require("ethers");
const {
  abi: keyRegistrarAbi,
  address: keyRegistrarAddress,
  gateway_registry_address: keyGatewayRegistryAddress,
} = require("../helpers/abi/key-registrar");
const {
  abi: idRegistrarAbi,
  address: idRegistrarAddress,
  gateway_registry_address: idGatewayRegistryAddress,
} = require("../helpers/abi/id-registrar");
const { getProvider } = require("../helpers/alchemy-provider");
const { getFlags } = require("../helpers/flags");

class AccountRecovererService {
  _accepableRecovererTypes = [
    "PASSKEY",
    "FARCASTER_SIGNER",
    "FARCASTER_SIGNER_EXTERNAL",
  ];

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
        rpId: process.env.NODE_ENV === "production" ? "Wield" : "localhost",
        rpName: "Wield", // replace with your application's name
      });
      const attestationExpectations = {
        challenge,
        origin:
          process.env.NODE_ENV === "production"
            ? "https://wield.co"
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
   * Add a Farcaster signer recoverer to an account
   * @param {Account} account
   * @returns Promise<AccountRecoverer>
   */
  async _addFarcasterSignerRecoverer(account, { address, id, type }) {
    return {
      type,
      id,
      pubKey: address?.toLowerCase?.(),
    };
  }

  /**
   * Verify an address is a signer to a fid
   * @param {Account} account
   * @param {String} address signer address or key
   * @param {String} fid FID to verify
   * @returns Promise<Boolean>
   */
  async verifyFarcasterSignerAndGetFid(_, { signerAddress, custodyAddress }) {
    const alchemyProvider = getProvider({
      network: 10,
      node: process.env.OPTIMISM_NODE_URL,
    });

    const flags = getFlags();
    const keyAddress = flags.USE_GATEWAYS
      ? keyGatewayRegistryAddress
      : keyRegistrarAddress;
    const idAddress = flags.USE_GATEWAYS
      ? idGatewayRegistryAddress
      : idRegistrarAddress;

    const keyRegistrar = new ethers.Contract(
      keyAddress,
      keyRegistrarAbi,
      alchemyProvider
    );
    const idRegistrar = new ethers.Contract(
      idAddress,
      idRegistrarAbi,
      alchemyProvider
    );

    const fid = await idRegistrar.idOf(custodyAddress);
    if (!fid) {
      throw new Error("Address does not own a valid FID");
    }
    const exist = await keyRegistrar.keyDataOf(fid, signerAddress);

    // state 1 = added, 0 = not added, 2 = removed
    return exist?.state === 1 ? fid : null;
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
  async addRecoverer(account, { signature, type, address, id }) {
    if (!account) throw new Error("Account not found");

    if (this._accepableRecovererTypes.indexOf(type) === -1) {
      throw new Error("Invalid recoverer type");
    }
    try {
      let recoverer;
      if (type === "PASSKEY") {
        recoverer = await this._addPasskeyRecoverer(account, { signature });
      } else if (
        type === "FARCASTER_SIGNER" ||
        type === "FARCASTER_SIGNER_EXTERNAL"
      ) {
        recoverer = await this._addFarcasterSignerRecoverer(account, {
          address,
          id,
          type,
        });
      }

      if (account.recoverers) {
        // dedupe
        if (
          account.recoverers.find(
            (r) => r.id === recoverer.id && r.pubKey === recoverer.pubKey
          )
        ) {
          return account;
        }
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
