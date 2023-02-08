import mongoose from "mongoose";
import { MessageSchema } from "../schema/main.js";
import { IMessage } from "../schema/interfaces.js";

class MessageClass extends mongoose.Model {
  static _buildPostFeedMatchQuery({
    filters,
  }: {
    filters: {
      showHidden?: boolean;
      excludeComments?: boolean;
      excludeChannels?: boolean;
      address?: string;
      message?: string;
      channel?: string;
      dimension?: string;
      dimensions?: [string];
    };
  }) {
    let matchQuery: {
      isHidden?: boolean;
      parent?: mongoose.Types.ObjectId | null;
      channel?: mongoose.Types.ObjectId | null;
      address?: mongoose.Types.ObjectId;
      dimension?: { $in: mongoose.Types.ObjectId[] } | mongoose.Types.ObjectId;
    } = {};
    if (!filters.showHidden) {
      matchQuery.isHidden = false;
    }
    if (filters.excludeComments) {
      matchQuery = {
        ...matchQuery,
        parent: null,
      };
    }
    if (filters.excludeChannels) {
      matchQuery = {
        ...matchQuery,
        channel: null,
      };
    }
    if (filters.address) {
      matchQuery = {
        ...matchQuery,
        address: new mongoose.Types.ObjectId(filters.address),
      };
    }
    if (filters.message) {
      matchQuery = {
        ...matchQuery,
        parent: new mongoose.Types.ObjectId(filters.message),
      };
    }
    if (filters.channel) {
      matchQuery = {
        ...matchQuery,
        channel: new mongoose.Types.ObjectId(filters.channel),
      };
    }
    if (filters.dimension) {
      matchQuery = {
        ...matchQuery,
        dimension: new mongoose.Types.ObjectId(filters.dimension),
      };
    }

    if (filters.dimensions && filters.dimensions.length) {
      matchQuery = {
        ...matchQuery,
        dimension: {
          $in: filters.dimensions.map((c) => new mongoose.Types.ObjectId(c)),
        },
      };
    }
    return matchQuery;
  }

  static async findAndSortByLatest({
    limit = 20,
    offset = 0,
    filters = {},
  }: {
    limit?: number;
    offset?: number;
    filters?: {
      showHidden?: boolean;
      excludeComments?: boolean;
      excludeChannels?: boolean;
      address?: string;
      message?: string;
      channel?: string;
      dimension?: string;
      dimensions?: [string];
    };
  }) {
    const matchQuery = this._buildPostFeedMatchQuery({ filters });

    const posts = await MessageClass.aggregate([
      { $match: matchQuery },
      { $sort: { createdAt: -1, _id: 1 } },
      { $skip: offset },
      { $limit: limit },
    ]);
    return posts;
  }
}

MessageSchema.loadClass(MessageClass);

export const Message =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
