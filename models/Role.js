const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html
const pick = require("lodash/pick");

const { schema } = require("../schemas/role");

const { Service: ContentService } = require("../services/ContentService");

class RoleClass {
  static ping() {
    console.log("model: RoleClass");
  }

  static async findById(id) {
    const role = await this.findOne({ _id: id });
    if (role?.isHidden) return null;
    return role;
  }

  static async _generateUniqueSlug({ name, communityId, index = 0 }) {
    if (index > 10) throw new Error("Cannot generate unique slug");

    /** generate random 4 numbers */
    let slug = "";
    if (!index) {
      // try using the name as slug
      slug = `${name.toLowerCase().replace(/\s/g, "-")}`;
    } else {
      const random = Math.floor(1000 + Math.random() * 9000);
      slug = `${name.toLowerCase().replace(/\s/g, "-")}-${random}`;
    }

    const found = await this.exists({ slug, community: communityId });
    if (found)
      return this._generateUniqueSlug({ name, communityId, index: index + 1 });
    return slug;
  }

  static async findAndSort({ communityId, limit = 10, offset = 0 }) {
    if (!communityId) throw new Error("Invalid community");
    const roles = await this.find({
      community: communityId,
    })
      .sort("-createdAt")
      .limit(limit)
      .skip(offset);
    return roles.filter((role) => role.isHidden !== true);
  }

  /**
   * Find default public role for a community
   * @param {ObjectId} communityId
   * @returns Role
   */
  static async findDefaultPublicRoleForCommunity({ communityId }) {
    if (!communityId) throw new Error("Invalid community");
    return this.findOne({ community: communityId, slug: "public" });
  }
  /**
   * Find default owner role for a community
   * @param {ObjectId} communityId
   * @returns Role
   */
  static async findDefaultOwnerRoleForCommunity({ communityId }) {
    if (!communityId) throw new Error("Invalid community");
    return this.findOne({ community: communityId, slug: "owner" });
  }
  /**
   * delete a role
   * @returns {Promise<string>}
   */
  async delete() {
    this.isHidden = true;
    this.slug = `deleted-${this.slug}`;

    await this.save();
    return this._id;
  }

  /**
   * edit a role
   * @param {string} name the role's name
   * @param {Content} description the role's description
   * @param {ObjectId} iconId the role's icon
   * @param {String} color the role's hex color string
   * @param {Boolean} isManagedByIndexer if the role is managed by the indexer
   * @returns {Promise<Role>}
   */
  async edit(fields) {
    const _fields = pick(fields, [
      "name",
      "description",
      "iconId",
      "color",
      "isManagedByIndexer",
    ]);

    if (
      _fields.name !== undefined &&
      fields.name.length < 64 &&
      this.name !== _fields.name
    ) {
      this.name = _fields.name;
      this.slug = await this.constructor._generateUniqueSlug({
        name: _fields.name,
        communityId: this.community,
      });
    }
    if (_fields.color !== undefined) {
      this.color = _fields.color;
    }

    if (_fields.isManagedByIndexer !== undefined) {
      this.isManagedByIndexer = _fields.isManagedByIndexer;
    }

    if (_fields.iconId !== undefined) this.icon = _fields.iconId;

    if (_fields.description !== undefined)
      this.description = new ContentService().makeContent({
        contentRaw: fields.description?.raw,
        contentJson: fields.description?.json,
        contentHtml: fields.description?.html,
      });

    return this.save();
  }

  /**
   * Create a new role
   * @param {ObjectId} communityId
   * @param {string} name
   * @param {Content} description
   * @param {ObjectId} iconId
   * @param {number} position
   * @returns {Promise<Role>}
   */
  static async create({
    communityId,
    name,
    description,
    iconId,
    position,
    color,
    isManagedByIndexer,
    editable,
  }) {
    if (!communityId) throw new Error("Invalid community");
    const slug = await this._generateUniqueSlug({ name, communityId });

    const role = new Role({
      community: communityId,
      name,
      slug,
      description: new ContentService().makeContent({
        contentRaw: description?.raw,
        contentJson: description?.json,
        contentHtml: description?.html,
      }),
      icon: iconId,
      position,
      color,
      isManagedByIndexer,
      editable,
    });

    return role.save();
  }
}

schema.loadClass(RoleClass);

const Role = mongoose.models.Role || mongoose.model("Role", schema);

module.exports = {
  Role,
};
