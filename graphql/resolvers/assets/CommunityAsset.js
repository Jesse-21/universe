const {
  Service: _CommunityAssetService,
} = require("../../../services/assets/CommunityAssetsService");
const {
  CommunityAssetMetadata,
} = require("../../../models/assets/CommunityAssetMetadata");

const CommunityAssetService = new _CommunityAssetService();
const resolvers = {
  CommunityAssetItem: {
    __resolveType(parent) {
      switch (parent.type) {
        case "ASSET_3D":
          return "Asset3DUnion";
        default:
          return "Asset3DUnion";
      }
    },
  },
  CommunityAsset: {
    asset: async (parent) => {
      const assetData = await CommunityAssetService.getAsset(parent);
      if (parent.type === "ASSET_3D") {
        return {
          _id: parent.asset,
          type: parent.type,
          asset3D: assetData,
        };
      } else {
        return null;
      }
    },
    metadata: async (parent, args) => {
      const metadata = await CommunityAssetMetadata.findAndSort({
        communityAssetId: parent._id,
        limit: args.limit,
        offset: args.offset,
        sort: args.sort,
      });
      return metadata;
    },
  },
};

module.exports = { resolvers };
