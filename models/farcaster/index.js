const mongoose = require("mongoose");

const {
  hubSubscriptionsSchema,
  messagesSchema,
  castsSchema,
  messagesMetadataSchema,
  messagesReactionsSchema,
  relaysSchema,
  castsMetadataSchema,
  castsReactionsSchema,
  relaysMetadataSchema,
  relaysReactionsSchema,
} = require("../../schemas/farcaster");

class HubSubscriptionsClass {
  static ping() {
    console.log("model: HubSubscriptionsClass");
  }
}
hubSubscriptionsSchema.loadClass(HubSubscriptionsClass);
const HubSubscriptions =
  mongoose.models.HubSubscriptions ||
  mongoose.model("HubSubscriptions", hubSubscriptionsSchema);

class MessagesClass {
  static ping() {
    console.log("model: MessagesClass");
  }
}
messagesSchema.loadClass(MessagesClass);
const Messages =
  mongoose.models.Messages || mongoose.model("Messages", messagesSchema);

class CastsClass {
  static ping() {
    console.log("model: CastsClass");
  }
}
castsSchema.loadClass(CastsClass);
const Casts = mongoose.models.Casts || mongoose.model("Casts", castsSchema);

class MessagesMetadataClass {
  static ping() {
    console.log("model: MessagesMetadataClass");
  }
}
messagesMetadataSchema.loadClass(MessagesMetadataClass);
const MessagesMetadata =
  mongoose.models.MessagesMetadata ||
  mongoose.model("MessagesMetadata", messagesMetadataSchema);

class MessagesReactionsClass {
  static ping() {
    console.log("model: MessagesReactionsClass");
  }
}
messagesReactionsSchema.loadClass(MessagesReactionsClass);
const MessagesReactions =
  mongoose.models.MessagesReactions ||
  mongoose.model("MessagesReactions", messagesReactionsSchema);

class RelaysClass {
  static ping() {
    console.log("model: RelaysClass");
  }
}
relaysSchema.loadClass(RelaysClass);
const Relays = mongoose.models.Relays || mongoose.model("Relays", relaysSchema);

class CastsMetadataClass {
  static ping() {
    console.log("model: CastsMetadataClass");
  }
}
castsMetadataSchema.loadClass(CastsMetadataClass);
const CastsMetadata =
  mongoose.models.CastsMetadata ||
  mongoose.model("CastsMetadata", castsMetadataSchema);

class CastsReactionsClass {
  static ping() {
    console.log("model: CastsReactionsClass");
  }
}
castsReactionsSchema.loadClass(CastsReactionsClass);
const CastsReactions =
  mongoose.models.CastsReactions ||
  mongoose.model("CastsReactions", castsReactionsSchema);

class RelaysMetadataClass {
  static ping() {
    console.log("model: RelaysMetadataClass");
  }
}
relaysMetadataSchema.loadClass(RelaysMetadataClass);
const RelaysMetadata =
  mongoose.models.RelaysMetadata ||
  mongoose.model("RelaysMetadata", relaysMetadataSchema);

class RelaysReactionsClass {
  static ping() {
    console.log("model: RelaysReactionsClass");
  }
}
relaysReactionsSchema.loadClass(RelaysReactionsClass);
const RelaysReactions =
  mongoose.models.RelaysReactions ||
  mongoose.model("RelaysReactions", relaysReactionsSchema);

module.exports = {
  HubSubscriptions,
  Messages,
  Casts,
  MessagesMetadata,
  MessagesReactions,
  Relays,
  CastsMetadata,
  CastsReactions,
  RelaysMetadata,
  RelaysReactions,
};
