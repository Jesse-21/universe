const mongoose = require("mongoose");
const BigInt = require("big-integer");

const { schema } = require("../schemas/permission");

const { Service: ContentService } = require("../services/ContentService");

class PermissionClass {
  static ping() {
    console.log("model: PermissionClass");
  }

  /**
   * verify if an unique identifier is already used by community
   * @TODO add a unique index to unique identifier + communityId
   * @param {string} uniqueIdentifier
   * @param {ObjectId} communityId
   * @returns {Promise<Boolean | Error>}
   */
  static async _verifyUniqueIdentifier({ uniqueIdentifier, communityId }) {
    const existing = await this.exists({
      uniqueIdentifier,
      community: communityId,
    });
    if (existing) {
      throw new Error(`Unique identifier ${uniqueIdentifier} already token`);
    }
    return true;
  }

  /**
   * Generate a permission's bitwiseFlag and bitwisePosition for a community
   * @param {string} communityId
   * @returns {Permission}
   */
  _generateBitwiseFlagAndPosition(bitwisePosition) {
    if (bitwisePosition > 62 || bitwisePosition < 0) {
      throw new Error("Invalid bitwisePosition: must be between 0 and 62");
    }
    this.bitwisePosition = bitwisePosition || 0;
    this.bitwiseFlag = BigInt(1 << this.bitwisePosition).toString();
    return this;
  }

  /**
   * Find a permission by unique identifier or id
   * @param {ObjectId | String} uniqueIdentifierOrId
   * @param {ObjectId} communityId
   */
  static async findByUniqueIdentifierOrId({
    communityId,
    permissionId,
    uniqueIdentifier,
  }) {
    let permission = null;

    // 1. find by id first
    if (permissionId) {
      permission = await this.findById(permissionId);
    }

    // 2. find by unique identifier
    if (!permission) {
      if (!communityId) return null;
      permission = await this.findOne({
        uniqueIdentifier: uniqueIdentifier,
        community: communityId,
      });
    }

    return permission;
  }

  /**
   * Create a new permission for community
   * @param {Community} community
   * @param {string} name
   * @param {string} description
   * @param {boolean} editable
   * @returns {Promise<Permission>}
   */
  static async create({
    communityId,
    name,
    description,
    editable,
    bitwisePosition,
    uniqueIdentifier,
  }) {
    if (!communityId) throw new Error("Invalid community");
    if (uniqueIdentifier) {
      await this._verifyUniqueIdentifier({
        uniqueIdentifier,
        communityId,
      });
    }

    const permission = new Permission({
      community: communityId,
      name,
      description: new ContentService().makeContent({
        contentRaw: description?.raw,
        contentJson: description?.json,
        contentHtml: description?.html,
      }),
      editable,
      uniqueIdentifier,
    });

    permission._generateBitwiseFlagAndPosition(bitwisePosition);

    return permission.save();
  }
}

schema.loadClass(PermissionClass);

const Permission =
  mongoose.models.Permission || mongoose.model("Permission", schema);

module.exports = {
  Permission,
};
