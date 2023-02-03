import mongoose from "mongoose";
import { ChannelSchema } from "../schema/main.js";

class ChannelClass extends mongoose.Model {
  static async _generateUniqueSlug({
    name,
    index = 0,
  }: {
    name: string;
    index?: number;
  }): Promise<string> {
    if (index > 10) throw new Error("Cannot generate unique slug");
    /** generate random 4 numbers */
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
    filters: { communityId?: string; onlyPublic?: boolean };
  }) {
    let matchQuery = {};
    if (filters.communityId) {
      matchQuery = {
        ...matchQuery,
        community: new mongoose.Types.ObjectId(filters.communityId),
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
}

ChannelSchema.loadClass(ChannelClass);

export const Channel =
  mongoose.models.Channel || mongoose.model("Channel", ChannelSchema);
