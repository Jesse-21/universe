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
};
