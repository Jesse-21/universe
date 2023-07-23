const mongoose = require("mongoose");
const get = require("lodash/get");
const pick = require("lodash/pick");

const { Magic } = require("@magic-sdk/admin");

const ChainHelpers = require("../helpers/chain");

const { AccountAddress } = require("./AccountAddress");
const { AccountNonce } = require("./AccountNonce");
const { AccountExp } = require("./AccountExp");
const { Image } = require("./Image");

const { schema } = require("../schemas/account");

const { generateNewAccessTokenFromAccount } = require("../helpers/jwt");
const {
  validateAndConvertAddress,
} = require("../helpers/validate-and-convert-address");

const { Service: ContentService } = require("../services/ContentService");

const Sentry = require("@sentry/node");

class AccountClass {
  static ping() {
    console.log("model: AccountClass");
  }

  static _getPublicFields() {
    return {
      username: 1,
      bio: 1,
      locaion: 1,
      profileImage: 1,
      sections: 1,
      addresses: 1,
    };
  }

  /** @returns Error or true */
  static async _existingUsernameCheck(account, username) {
    if (account.username === username) return true;
    if (account.username?.toLowerCase() === username?.toLowerCase())
      return true;

    const existing = await Account.exists({
      usernameLowercase: username?.toLowerCase(),
    });
    if (existing) throw new Error("An account exists with this username.");
    return existing;
  }
  /** @returns Error or true */
  static async _existingEmailCheck(account, email) {
    if (account.email === email) return true;
    const existing = await Account.exists({ email });
    if (existing) throw new Error("An account exists with this email.");
    return existing;
  }
  /** @returns Error or true */
  static async _profileImageIdExistCheck(imageId) {
    const existing = await Image.exists({ id: imageId });
    if (!existing) throw new Error("Invalid Image Id");
    return true;
  }

  /**
   * Create an account with encrypted wallet json and signature
   * @TODO we need to verify the validity of the email
   * @returns Promise<Account>
   */
  static async createFromEncryptedWalletJson({
    email,
    encyrptedWalletJson,
    chainId,
  }) {
    try {
      const walletDecrypted = JSON.parse(encyrptedWalletJson);
      const address = walletDecrypted.address;
      let account;
      const existing = await this.findOne({
        walletEmail: email,
      });
      if (existing) {
        account = existing;
      } else {
        account = await this.createFromAddress({
          address: address,
          chainId,
          walletEmail: email,
          encyrptedWalletJson: encyrptedWalletJson,
        });
      }

      return account;
    } catch (e) {
      throw new Error("Could not create with wallet");
    }
  }

  /**
   * Create an account from address
   * @returns Promise<Account>
   */
  static async createFromAddress({
    address: rawAddress,
    chainId,
    email,
    walletEmail,
    encyrptedWalletJson,
  }) {
    if (!get(ChainHelpers, `chainTable[${chainId}]`)) {
      throw new Error("Invalid chain id");
    }
    const address = validateAndConvertAddress(rawAddress, chainId);

    const existing = await this.findByAddressAndChainId({
      address,
      chainId,
    });
    if (existing?.deleted) throw new Error("Account is deleted");
    if (existing) return existing;
    const createdNonceTmp = new AccountNonce();
    const createdExpTmp = new AccountExp();
    const createdAddressTmp = new AccountAddress({
      address,
      chain: {
        chainId,
        name: ChainHelpers.mapChainIdToName(chainId),
      },
    });
    const createdAccount = await this.create({
      email,
      addresses: [createdAddressTmp._id],
      activities: {},
      walletEmail,
      encyrptedWalletJson,
    });
    createdAddressTmp.account = createdAccount._id;
    createdNonceTmp.account = createdAccount._id;
    createdExpTmp.account = createdAccount._id;
    await createdAddressTmp.save();
    await createdNonceTmp.save();
    await createdExpTmp.save();

    try {
      await this.findByAddressAndChainId({
        address,
        chainId,
      });
    } catch (e) {
      // This means we created a duplicate account
      // This is a rare case, but it can happen
      // We should delete the account we just created
      // and return the existing account
      await createdAccount.delete();
      await createdAddressTmp.delete();
      await createdNonceTmp.delete();
      await createdExpTmp.delete();
      throw e;
    }

    return createdAccount;
  }

  /**
   * Find an account from address and chainId
   * @returns Promise<Account | null>
   */
  static async findByAddressAndChainId({ address: rawAddress, chainId }) {
    const address = validateAndConvertAddress(rawAddress, chainId);

    const accountAddress = await AccountAddress.aggregate([
      {
        $match: {
          $and: [{ "chain.chainId": chainId }, { address }],
        },
      },
    ]);

    if (!accountAddress || !accountAddress.length) return null;
    if (accountAddress.length > 1) {
      throw new Error(
        `Multiple accounts found for address ${address} and chainId ${chainId}!`
      );
    }
    const account = await this.findById(get(accountAddress, "[0].account"));
    if (!account) {
      throw new Error(
        `AccountAddress has a null account for address ${address} and chainId ${chainId}!`
      );
    }
    return account;
  }

  /**
   * Find or create an account from address and chain Id
   * @returns Promise<Account>
   */
  static async findOrCreateByAddressAndChainId({ address, chainId }) {
    /** this function takes care cases where account exists */
    return await Account.createFromAddress({ address, chainId });
  }

  /**
   * Verify an account's signature with nonce
   * @returns Promise<Account, AccountNonce>
   * @deprecated in favor of AuthService
   */
  static async verifySignature({ address, chainId, signature }) {
    const account = await Account.findByAddressAndChainId({ address, chainId });
    if (!account) throw new Error("Account not found");

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
   * @deprecated in favor of AuthService
   */
  static async authBySignature({ address, chainId, signature }) {
    let account, accountNonce;
    /** step0: if sign in by email */
    if (address == "0x0magiclink") {
      let magic = new Magic(process.env.MAGIC_LINK_SECRET);
      await magic.token.validate(signature);
      const metadata = await magic.users.getMetadataByToken(signature);
      account = await this.findOne({ email: metadata.email });
      if (!account) throw new Error("Account not found");
      accountNonce = await AccountNonce.findOne({ account: account._id });
    } else {
      /** step1: verify the user has a verified sigature */
      const val = await Account.verifySignature({
        address,
        chainId,
        signature,
      });
      account = val.account;
      accountNonce = val.accountNonce;
    }
    /** step2: generate new nonce for the user */
    await accountNonce.generateNewNonce();
    /** step3: generate a jwt token and pass over to the client */
    const accessToken = await generateNewAccessTokenFromAccount(account);
    return { account, accountNonce, accessToken };
  }

  async updateMe(fields) {
    const _fields = pick(fields, [
      "email",
      "location",
      "username",
      "profileImageId",
      "bio",
      "isOnboarded",
      "expoPushToken",
    ]);

    if (_fields.username)
      await Account._existingUsernameCheck(this, _fields.username);
    if (_fields.profileImageId)
      await Account._profileImageIdExistCheck(_fields.profileImageId);
    if (_fields.email) await Account._existingEmailCheck(this, _fields.email);

    if (_fields.username !== undefined) {
      this.username = _fields.username;
      this.usernameLowercase = _fields.username.toLowerCase();
    }
    if (_fields.location !== undefined) this.location = _fields.location;
    if (_fields.email !== undefined)
      this.email = _fields.email?.toLowerCase() || null;
    if (_fields.isOnboarded !== undefined) {
      if (!this.activities) {
        this.activities = {};
      }
      this.activities.isOnboarded = _fields.isOnboarded;
    }
    if (_fields.profileImageId !== undefined)
      this.profileImage = _fields.profileImageId;
    // @TODO add html content to bio
    if (_fields.bio !== undefined)
      this.bio = new ContentService().makeContent({ contentRaw: _fields.bio });

    if (_fields.expoPushToken !== undefined) {
      let s = new Set(this.expoPushTokens || []);
      s.add(_fields.expoPushToken);
      this.expoPushTokens = [...s];
    }

    return this.save();
  }

  /**
   * Get the default AccountAddress mongo _id
   * @returns string
   */
  get addressId() {
    return get(this, "addresses[0]", null);
  }
}

schema.loadClass(AccountClass);

const Account = mongoose.models.Account || mongoose.model("Account", schema);

module.exports = {
  Account,
};
