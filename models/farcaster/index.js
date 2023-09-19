const mongoose = require("mongoose");

const {
  hubSubscriptionsSchema,
  messagesSchema,
  castsSchema,
  reactionsSchema,
  signersSchema,
  verificationsSchema,
  userDataSchema,
  fidsSchema,
  fnamesSchema,
  linksSchema,
  notificationsSchema,
} = require("../../schemas/farcaster");

class HubSubscriptionsClass {
  static ping() {
    console.log("model: HubSubscriptionsClass");
  }
}
hubSubscriptionsSchema.loadClass(HubSubscriptionsClass);
const HubSubscriptions =
  mongoose.models.HubSubscriptions ||
  mongoose.model("farcaster.HubSubscriptions", hubSubscriptionsSchema);

class MessagesClass {
  static ping() {
    console.log("model: MessagesClass");
  }
}
messagesSchema.loadClass(MessagesClass);
const Messages =
  mongoose.models.Messages ||
  mongoose.model("farcaster.Messages", messagesSchema);

class CastsClass {
  static ping() {
    console.log("model: CastsClass");
  }
}
castsSchema.loadClass(CastsClass);
const Casts =
  mongoose.models.Casts || mongoose.model("farcaster.Casts", castsSchema);

class ReactionsClass {
  static async countDistinct(matchArgs) {
    if (!matchArgs) {
      return 0;
    }
    const aggregationResult = await this.aggregate([
      {
        $match: matchArgs,
      },
      {
        $group: {
          _id: "$fid",
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);

    return aggregationResult.length > 0 ? aggregationResult[0].count : 0;
  }

  static ping() {
    console.log("model: ReactionsClass");
  }
}
reactionsSchema.loadClass(ReactionsClass);
const Reactions =
  mongoose.models.Reactions ||
  mongoose.model("farcaster.Reactions", reactionsSchema);

class SignersClass {
  static ping() {
    console.log("model: SignersClass");
  }
}
signersSchema.loadClass(SignersClass);
const Signers =
  mongoose.models.Signers || mongoose.model("farcaster.Signers", signersSchema);

class VerificationsClass {
  static ping() {
    console.log("model: VerificationsClass");
  }
}
verificationsSchema.loadClass(VerificationsClass);

const Verifications =
  mongoose.models.Verifications ||
  mongoose.model("farcaster.Verifications", verificationsSchema);

class UserDataClass {
  static ping() {
    console.log("model: UserDataClass");
  }
}

userDataSchema.loadClass(UserDataClass);
const UserData =
  mongoose.models.UserData ||
  mongoose.model("farcaster.UserData", userDataSchema);

class FidsClass {
  static ping() {
    console.log("model: FidsClass");
  }
}

fidsSchema.loadClass(FidsClass);
const Fids =
  mongoose.models.Fids || mongoose.model("farcaster.Fids", fidsSchema);

class FnamesClass {
  static ping() {
    console.log("model: FnamesClass");
  }
}

fnamesSchema.loadClass(FnamesClass);
const Fnames =
  mongoose.models.Fnames || mongoose.model("farcaster.Fnames", fnamesSchema);

class LinksClass {
  static ping() {
    console.log("model: LinksClass");
  }
}

linksSchema.loadClass(LinksClass);
const Links =
  mongoose.models.Links || mongoose.model("farcaster.Links", linksSchema);

class NotificationsClass {
  static ping() {
    console.log("model: NotificationsClass");
  }
}

notificationsSchema.loadClass(NotificationsClass);
const Notifications =
  mongoose.models.Notifications ||
  mongoose.model("farcaster.Notifications", notificationsSchema);

const UserDataType = {
  USER_DATA_TYPE_NONE: 0,
  USER_DATA_TYPE_PFP: 1,
  USER_DATA_TYPE_DISPLAY: 2,
  USER_DATA_TYPE_BIO: 3,
  USER_DATA_TYPE_URL: 5,
  USER_DATA_TYPE_USERNAME: 6,
};

const ReactionType = {
  REACTION_TYPE_NONE: 0,
  REACTION_TYPE_LIKE: 1,
  REACTION_TYPE_RECAST: 2,
};

const MessageType = {
  MESSAGE_TYPE_NONE: 0,
  MESSAGE_TYPE_CAST_ADD: 1,
  MESSAGE_TYPE_CAST_REMOVE: 2,
  MESSAGE_TYPE_REACTION_ADD: 3,
  MESSAGE_TYPE_REACTION_REMOVE: 4,
  MESSAGE_TYPE_LINK_ADD: 5,
  MESSAGE_TYPE_LINK_REMOVE: 6,
  MESSAGE_TYPE_VERIFICATION_ADD_ETH_ADDRESS: 7,
  MESSAGE_TYPE_VERIFICATION_REMOVE: 8,
  MESSAGE_TYPE_SIGNER_ADD: 9,
  MESSAGE_TYPE_SIGNER_REMOVE: 10,
  MESSAGE_TYPE_USER_DATA_ADD: 11,
  MESSAGE_TYPE_USERNAME_PROOF: 12,
};

module.exports = {
  HubSubscriptions,
  Messages,
  Casts,
  Reactions,
  Signers,
  Verifications,
  UserData,
  Fids,
  Fnames,
  Links,
  Notifications,
  UserDataType,
  ReactionType,
  MessageType,
};
