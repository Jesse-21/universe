import { merge } from "lodash-es";

import { resolvers as addressResolvers } from "./address.js";
import { resolvers as addressDimensionResolvers } from "./addressdimension.js";
import { resolvers as addressNonceResolvers } from "./addressnonce.js";
import { resolvers as channelResolvers } from "./channel.js";
import { resolvers as dimensionResolvers } from "./dimension.js";
import { resolvers as imageResolvers } from "./image.js";
import { resolvers as linkResolvers } from "./link.js";
import { resolvers as messageResolvers } from "./message.js";
import { resolvers as permissionResolvers } from "./permission.js";
import { resolvers as permissionOverwriteResolvers } from "./permissionoverwrite.js";
import { resolvers as queryResolvers } from "./query.js";
import { resolvers as richEmbedResolvers } from "./richembed.js";
import { resolvers as roleResolvers } from "./role.js";
import { resolvers as channelRecipientResolvers } from "./channelrecipient.js";

export const resolvers = merge(
  addressResolvers,
  addressDimensionResolvers,
  addressNonceResolvers,
  channelResolvers,
  dimensionResolvers,
  imageResolvers,
  linkResolvers,
  messageResolvers,
  permissionResolvers,
  permissionOverwriteResolvers,
  queryResolvers,
  richEmbedResolvers,
  roleResolvers,
  channelRecipientResolvers
);
