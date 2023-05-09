const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html
const pick = require("lodash/pick");
const { schema } = require("../schemas/community");

const { Service: ContentService } = require("../services/ContentService");

class CommunityClass {
  static ping() {
    console.log("model: CommunityClass");
  }

  static _buildMatchQuery(filters = {}) {
    let match = {};
    if (filters.domains) {
      match = {
        ...match,
        bebdomain: { $in: filters.domains },
      };
    }
    return match;
  }

  /**
   * Find Community
   * @returns Community[]
   */
  static async findAndSort({ sort, ...props }) {
    if (sort === "trendy") {
      return this.findAndSoryByTrendy(props);
    } else {
      return this.findAndSoryByCreated(props);
    }
  }

  /**
   * Find Community
   * @returns Community[]
   */
  static async findAndSoryByCreated({ offset = 0, limit = 10, filters = {} }) {
    const match = this._buildMatchQuery(filters);
    const communities = await this.aggregate([
      { $match: match },
      { $sort: { createdAt: -1, _id: 1 } },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);
    return communities;
  }

  /**
   * Find Community
   * @returns Community[]
   */
  static async findAndSoryByTrendy({ offset = 0, limit = 10 }) {
    const communities = await this.aggregate([
      {
        $lookup: {
          from: "posts",
          let: {
            community: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$community", "$$community"] },
                createdAt: {
                  // 7 days ago
                  $gte: new Date(
                    new Date().getTime() - 1000 * 60 * 60 * 24 * 7
                  ),
                },
              },
            },
            // unique by account
            { $group: { _id: "$account" } },
          ],
          as: "trendyPosts",
        },
      },
      // count how many trendy posts
      {
        $addFields: {
          trendyPostCount: { $size: "$trendyPosts" },
        },
      },
      { $sort: { trendyPostCount: -1, _id: 1 } },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);

    return communities;
  }

  /**
   * update community
   * only the owner can update the community
   * @param {Community} community
   * @param {string} name the community's name
   * @param {string} description the community's description
   * @param {ObjectId} iconId the community's icon
   * @param {String} color the community's hex color string
   * @param {Boolean} isManagedByIndexer if the community is managed by the indexer
   * @returns {Promise<Role>}
   */
  async edit(fields) {
    const _fields = pick(fields, [
      "name",
      "imageId",
      "bannerImageId",
      "bio",
      "socialLinks", // @TODO add social links
    ]);

    if (_fields.name !== undefined && fields.name.length < 64) {
      this.name = _fields.name;
    }
    if (_fields.imageId !== undefined) this.image = _fields.imageId;
    if (_fields.bannerImageId !== undefined)
      this.bannerImage = _fields.bannerImageId;

    if (_fields.bio !== undefined)
      this.bio = new ContentService().makeContent({
        contentRaw: fields.bio?.raw,
        contentJson: fields.bio?.json,
        contentHtml: fields.bio?.html,
      });

    return this.save();
  }
}

schema.loadClass(CommunityClass);

const Community =
  mongoose.models.Community || mongoose.model("Community", schema);

module.exports = {
  Community,
};
