const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html
const pick = require("lodash/pick");
const { schema } = require("../schemas/channel");

const { Service: ContentService } = require("../services/ContentService");

class ChannelClass {
  static ping() {
    console.log("model: ChannelClass");
  }

  static async _generateUniqueSlug({ name, index = 0 }) {
    if (index > 10) throw new Error("Cannot generate unique slug");
    /** generate random 4 numbers */
    const random = Math.floor(1000 + Math.random() * 9000);
    const slug = `${name.toLowerCase().replace(/\s/g, "-")}-${random}`;
    const found = await this.exists({ slug });
    if (found) return this._generateUniqueSlug({ name, index: index + 1 });
    return slug;
  }

  /**
   * Build query for ChannelFilter
   */
  static _buildMatchQuery({ filters }) {
    let matchQuery = {};
    if (filters.communityId) {
      matchQuery = {
        ...matchQuery,
        community: mongoose.Types.ObjectId(filters.communityId),
      };
    }
    if (filters.onlyPublic) {
      matchQuery = {
        ...matchQuery,
        $or: [
          {
            recipients: {
              $exists: false,
            },
          },
          {
            recipients: {
              $size: 0,
            },
          },
        ],
      };
    }

    return matchQuery;
  }

  /**
   * Build query for ChannelFilter
   */
  static _lookupByRecipientIds({ filters }) {
    let lookupQueries = [];
    if (filters.recipientIds && filters.recipientIds.length) {
      lookupQueries.push({
        $lookup: {
          from: "channelrecipients",
          localField: "recipients",
          foreignField: "_id",
          as: "recipients",
        },
      });
      lookupQueries.push({
        $match: {
          recipients: {
            $elemMatch: {
              recipientId: {
                $in: filters.recipientIds.map((id) =>
                  mongoose.Types.ObjectId(id)
                ),
              },
            },
          },
        },
      });
    }
    return lookupQueries;
  }

  /**
   * Find Channels
   * @returns Channel[]
   */
  static async findAndSort({
    filters,
    sort = "-createdAt",
    offset = 0,
    limit = 10,
  }) {
    let matchQuery = this._buildMatchQuery({ filters });
    const $sort =
      sort[0] === "-" ? { [sort.slice(1)]: -1, _id: 1 } : { [sort]: 1, _id: 1 };
    const pipeline = [{ $match: matchQuery }];
    if (filters.recipientIds) {
      pipeline.push(...this._lookupByRecipientIds({ filters }));
      // push a lookup stage to the pipeline
    }

    const channels = await this.aggregate([
      ...pipeline,
      { $sort: $sort },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);

    return channels;
  }

  /**
   * update the last post of a channel
   * @returns {Promise<string>}
   */
  static async updateLastPost({ channelId, postId }) {
    const channel = await this.findById(channelId);
    if (!channel) throw new Error("Channel not found");
    channel.lastPost = postId;
    channel.lastPostCreatedAt = new Date();

    await channel.save();
    return channel;
  }

  /**
   * Edit a channel
   * @param {ObjectId} communityId
   * @param {string} name
   * @param {Content} description
   * @param {ObjectId} iconId
   * @param {number} position
   * @returns {Promise<Channel>}
   */
  async edit(fields) {
    const _fields = pick(fields, ["name", "description", "position"]);

    if (_fields.name !== undefined && fields.name.length < 64) {
      this.name = _fields.name;
      this.slug = await this.constructor._generateUniqueSlug({
        name: _fields.name,
      });
    }
    if (_fields.position !== undefined) this.position = _fields.position;

    if (_fields.description !== undefined)
      this.description = new ContentService().makeContent({
        contentRaw: fields.description?.raw,
        contentJson: fields.description?.json,
        contentHtml: fields.description?.html,
      });

    return this.save();
  }

  /**
   * Create a new channel
   * @param {ObjectId} communityId
   * @param {string} name
   * @param {Content} description
   * @param {ObjectId} iconId
   * @returns {Promise<Channel>}
   */
  static async create({ communityId, name, description, createdBy }) {
    if (!communityId) throw new Error("Invalid community");
    const slug = await this._generateUniqueSlug({ name });
    const channel = new Channel({
      community: communityId,
      name,
      slug,
      createdBy,
      description: new ContentService().makeContent({
        contentRaw: description?.raw,
        contentJson: description?.json,
        contentHtml: description?.html,
      }),
    });

    return channel.save();
  }

  /**
   * delete a channel
   * @returns {Promise<string>}
   */
  async delete() {
    this.isHidden = true;

    await this.save();
    return this._id;
  }
}

schema.loadClass(ChannelClass);

const Channel = mongoose.models.Channel || mongoose.model("Channel", schema);

module.exports = {
  Channel,
};
