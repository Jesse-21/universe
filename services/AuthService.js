const { Magic } = require("@magic-sdk/admin");
const mongoose = require("mongoose");

const { Account } = require("../models/Account");
const { AccountCommunity } = require("../models/AccountCommunity");
const { AccountNonce } = require("../models/AccountNonce");

const { Service: _AccountService } = require("./AccountService");

const { generateNewAccessTokenFromAccount } = require("../helpers/jwt");

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
   * @returns Promise<Account, AccountNonce, String>
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
   * @returns Promise<Account, AccountNonce, String>
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
   * Authenticate an account
   * @returns Promise<Account, AccountNonce, AccessTokenString>
   */
  async authenticate({ address, chainId, signature }) {
    let account = null;

    /** step1: authenticate with correct provider */
    if (address == "0x0magiclink") {
      account = await this.authByEmail({ address, chainId, signature });
    } else {
      account = await this.authBySignature({ address, chainId, signature });
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
