const mongoose = require("mongoose");
const { schema } = require("../schemas/communityRoom");

class CommunityRoomClass {}

schema.loadClass(CommunityRoomClass);

const CommunityRoom =
  mongoose.models.CommunityRoom || mongoose.model("CommunityRoom", schema);

module.exports = {
  CommunityRoom,
};
