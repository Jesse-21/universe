import { Dimension } from "../models/dimension.js";
import { Image } from "../models/image.js";
import { ChannelRecipient } from "../models/channelrecipient.js";
import { IChannel } from "../schema/interfaces.js";

export const resolvers = {
  Channel: {
    dimension: async (parent: IChannel) => {
      return await Dimension.findById(parent.dimension);
    },
    icon: async (parent: IChannel) => {
      return await Image.findById(parent.icon);
    },
    recipients: async (parent: IChannel) => {
      if (!parent?.recipients?.length) return [];
      if (parent.recipients?.[0] instanceof ChannelRecipient) {
        return parent.recipients;
      }
      const recipients = await ChannelRecipient.find({ channel: parent._id });
      return recipients;
    },
  },
};
