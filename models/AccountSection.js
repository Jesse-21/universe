const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { Account } = require("./Account");
const { Image } = require("./Image");

const { schema } = require("../schemas/accountSection");

class AccountSectionClass {
  static ping() {
    console.log("model: AccountSectionClass");
  }

  static _getDefaultEntry() {
    return {
      title: "New entry",
      content: {},
    };
  }
  /** @returns Error or true */
  static async _accontExistsCheck(accountId) {
    const existing = await Account.exists({ id: accountId });
    if (!existing || !accountId) throw new Error("Invalid Account Id");
    return true;
  }

  /** @returns Error or true */
  static async _imageExistCheck(imageId) {
    const existing = await Image.exists({ id: imageId });
    if (!existing) throw new Error("Invalid Image Id");
    return true;
  }

  /**
   * Create a default AccountSection, and add it to the Account
   * @returns Promise<AccountSection>
   */
  static async addDefaultToAccount({ includeDefaultEntry, title, accountId }) {
    await this._accontExistsCheck(accountId);
    const entries = includeDefaultEntry
      ? [AccountSection._getDefaultEntry()]
      : [];
    const created = await this.create({
      title: title || "New section",
      account: accountId,
      entries,
      isVisible: false,
    });
    const account = await Account.findById(accountId).select("sections");
    account.sections = [...account.sections, created._id];
    await account.save();
    return created;
  }

  /**
   * Update an account section
   * @returns Promise<AccountSection>
   */
  async updateMe({ title, isVisible }) {
    if (title !== undefined) this.title = title;
    if (isVisible !== undefined) this.isVisible = isVisible;
    await this.save();
    return this;
  }

  /**
   * Delete an account section
   * @returns Promise<ID>
   */
  async deleteMe() {
    const { _id, account } = this;
    await this.remove();

    await Account.updateOne({ _id: account }, { $pull: { sections: _id } });
    return _id;
  }

  /**
   * Update an entry
   * @returns Promise<AccountSection>
   */
  async updateEntry(id, { imageId, content, link, title } = {}) {
    const entry = this.entries.id(id);
    if (!entry) throw new Error("Invalid entry");
    if (imageId !== undefined) await AccountSection._imageExistCheck(imageId);

    // @TODO add content sanity check
    if (content !== undefined) entry.content = content;
    if (link !== undefined) entry.link = link;
    if (title !== undefined) entry.title = title;
    if (imageId !== undefined) entry.image = imageId;
    await this.save();
    return this;
  }

  /**
   * Add a default entry
   * @returns Promise<AccountSection>
   */
  async addDefauEntry() {
    this.entries.push(AccountSection._getDefaultEntry());
    await this.save();
    return this;
  }

  /**
   * Delete entry by id
   * @returns Promise<AccountSection>
   */
  async deleteEntry(id) {
    this.entries.id(id).remove();
    await this.save();
    return this;
  }
}

schema.loadClass(AccountSectionClass);

const AccountSection =
  mongoose.models.AccountSection || mongoose.model("AccountSection", schema);

module.exports = {
  AccountSection,
};
