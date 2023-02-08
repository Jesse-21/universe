import mongoose from "mongoose";
import { ChannelSchema } from "../schema/main.js";
import { IChannel } from "../schema/interfaces.js";
class ChannelClass extends mongoose.Model {
  static async _generateUniqueSlug({
    name,
    index = 0,
  }: {
    name: string;
    index?: number;
  }): Promise<string> {
    if (index > 10) throw new Error("Cannot generate unique slug");
    const random = Math.floor(1000 + Math.random() * 9000);
    const slug = `${name.toLowerCase().replace(/\s/g, "-")}-${random}`;
    const found = await this.exists({ slug });
    if (found)
      return await this._generateUniqueSlug({ name, index: index + 1 });
    return slug;
  }

  static _buildMatchQuery({
    filters,
  }: {
    filters: { dimensionId?: string; onlyPublic?: boolean };
  }): mongoose.FilterQuery<ChannelClass> {
    let matchQuery = {};
    if (filters.dimensionId) {
      matchQuery = {
        ...matchQuery,
        dimension: new mongoose.Types.ObjectId(filters.dimensionId),
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

  static _lookupByRecipientIds({
    filters,
  }: {
    filters: { recipientIds?: string[] };
  }): {
    $match?: mongoose.FilterQuery<ChannelClass>;
    $lookup?: mongoose.FilterQuery<ChannelClass>;
  }[] {
    const lookupQueries = [];
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
                $in: filters.recipientIds.map(
                  (id) => new mongoose.Types.ObjectId(id)
                ),
              },
            },
          },
        },
      });
    }
    return lookupQueries;
  }

  static async findAndSort({
    filters,
    sort = "-createdAt",
    offset = 0,
    limit = 10,
  }: {
    filters: {
      dimensionId?: string;
      onlyPublic?: boolean;
      recipientIds?: string[];
    };
    sort?: string;
    offset?: number;
    limit?: number;
  }): Promise<ChannelClass[]> {
    const matchQuery = this._buildMatchQuery({ filters });
    const $sort =
      sort[0] === "-" ? { [sort.slice(1)]: -1, _id: 1 } : { [sort]: 1, _id: 1 };
    const pipeline: {
      $match?: mongoose.FilterQuery<ChannelClass>;
      $lookup?: mongoose.FilterQuery<ChannelClass>;
    }[] = [{ $match: matchQuery }];
    if (filters.recipientIds) {
      pipeline.push(...this._lookupByRecipientIds({ filters }));
      // push a lookup stage to the pipeline
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const channels = await this.aggregate([
      ...pipeline,
      { $sort: $sort },
      { $skip: offset },
      { $limit: limit },
    ]);

    return channels;
  }

  static async updateLastPost({
    channelId,
    postId,
  }: {
    channelId: string;
    postId: string;
  }): Promise<ChannelClass> {
    const channel = await this.findById(channelId);
    if (!channel) throw new Error("Channel not found");
    channel.lastPost = postId;
    channel.lastPostCreatedAt = new Date();

    await channel.save();
    return channel;
  }

  async delete(): Promise<string> {
    this.isHidden = true;

    await this.save();
    return this._id;
  }
}

ChannelSchema.loadClass(ChannelClass);

export const Channel =
  mongoose.models.Channel || mongoose.model<IChannel>("Channel", ChannelSchema);
