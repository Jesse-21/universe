const {
  Service: _RichBlockService,
} = require("../../services/RichBlockService");

const resolvers = {
  RichBlock: {
    __resolveType(parent) {
      switch (parent.type) {
        case "IMAGE":
          return "ImageUnion";
        case "LINK":
          return "LinkUnion";
        case "RICH_EMBED":
          return "RichEmbedUnion";
        case "QUEST":
          return "QuestUnion";
        case "SCRIPTABLE_ACTION":
          return "ScriptableActionUnion";
        default:
          return "ImageUnion";
      }
    },
  },
  RichContentBlock: {
    id: (parent) => parent.blockId,
    block: async (parent) => {
      const RichBlockService = new _RichBlockService();
      let _block = await RichBlockService.getBlock({
        blockType: parent.blockType,
        blockId: parent.blockId,
      });
      let _key = null;
      if (parent.blockType === "IMAGE") {
        _key = "image";
      } else if (parent.blockType === "LINK") {
        _key = "link";
      } else if (parent.blockType === "RICH_EMBED") {
        _key = "richEmbed";
      } else if (parent.blockType === "QUEST") {
        _key = "quest";
      } else if (parent.blockType === "SCRIPTABLE_ACTION") {
        _key = "scriptableAction";
      }

      if (!_block) return null;
      return { _id: parent.blockId, [_key]: _block, type: parent.blockType };
    },
  },
};

module.exports = { resolvers };
