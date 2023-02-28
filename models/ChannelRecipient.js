const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/channelRecipient");

class ChannelRecipientClass {
  static ping() {
    console.log("model: ChannelRecipientClass");
  }
  /**
   * Build query for ChannelRecipientFilter
   */
  static _buildMatchQuery({ filters }) {
    let matchQuery = {};
    if (filters.recipientIds && filters.recipientIds.length) {
      matchQuery = {
        ...matchQuery,
        recipientId: {
          $in: filters.recipientIds.map((id) => mongoose.Types.ObjectId(id)),
        },
      };
    }
    if (filters.recipientType) {
      matchQuery = {
        ...matchQuery,
        recipientType: filters.recipientType,
      };
    }

    if (filters.communityId) {
      matchQuery = {
        ...matchQuery,
        community: mongoose.Types.ObjectId(filters.communityId),
      };
    }

    return matchQuery;
  }

  static async findAndSort({
    limit = 20,
    offset = 0,
    filters = {},
    sort = "createdAt",
  } = {}) {
    let matchQuery = this._buildMatchQuery({ filters });
    const $sort =
      sort[0] === "-" ? { [sort.slice(1)]: -1, _id: 1 } : { [sort]: 1, _id: 1 };

    const channelRecipients = await this.aggregate([
      { $match: matchQuery },
      { $sort: $sort },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);
    return channelRecipients;
  }
}

schema.loadClass(ChannelRecipientClass);

const ChannelRecipient =
  mongoose.models.ChannelRecipient ||
  mongoose.model("ChannelRecipient", schema);

module.exports = {
  ChannelRecipient,
};
