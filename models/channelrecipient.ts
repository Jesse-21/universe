import mongoose from "mongoose";
import { ChannelRecipientSchema } from "../schema/main.js";

class ChannelRecipientClass extends mongoose.Model {
  static _buildMatchQuery({
    filters,
  }: {
    filters: {
      recipientIds?: string[];
      recipientType?: string;
      communityId?: string;
    };
  }): mongoose.FilterQuery<ChannelRecipientClass> {
    let matchQuery = {};
    if (filters.recipientIds && filters.recipientIds.length) {
      matchQuery = {
        ...matchQuery,
        recipientId: {
          $in: filters.recipientIds.map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
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
        community: new mongoose.Types.ObjectId(filters.communityId),
      };
    }

    return matchQuery;
  }

  static async findAndSort({
    limit = 20,
    offset = 0,
    filters = {},
    sort = "createdAt",
  }: {
    limit?: number;
    offset?: number;
    filters?: {
      recipientIds?: string[];
      recipientType?: string;
      communityId?: string;
    };
    sort?: string;
  }) {
    const matchQuery = this._buildMatchQuery({ filters });
    const $sort =
      sort[0] === "-" ? { [sort.slice(1)]: -1, _id: 1 } : { [sort]: 1, _id: 1 };

    const channelRecipients = await this.aggregate([
      { $match: matchQuery },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      { $sort: $sort },
      { $skip: offset },
      { $limit: limit },
    ]);
    return channelRecipients;
  }
}

ChannelRecipientSchema.loadClass(ChannelRecipientClass);

export const ChannelRecipient =
  mongoose.models.ChannelRecipient ||
  mongoose.model("ChannelRecipient", ChannelRecipientSchema);
