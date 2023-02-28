const { Asset3D } = require("../../models/assets/Asset3D");
const { CommunityAsset } = require("../../models/assets/CommunityAsset");
const {
  CommunityAssetMetadata,
} = require("../../models/assets/CommunityAssetMetadata");

const { Vector3D } = require("../../helpers/vector3D");

class CommunityAssetService {
  async getAsset(communityAsset) {
    if (!communityAsset) return null;
    switch (communityAsset.type) {
      case "ASSET_3D":
        return Asset3D.findById(communityAsset.asset);
      default:
        return null;
    }
  }

  /**
   * Initialize community asset max quantity metadata
   * @returns ObjectId[] inserted metadata ids
   */
  async initializeCommunityAssetMetadata(
    communityAsset,
    { maxQuantity } = { maxQuantity: 0 }
  ) {
    if (!communityAsset) return null;
    const metadata = [];
    for (let i = 0; i < maxQuantity; i++) {
      metadata.push({
        communityAsset: communityAsset._id,
      });
    }
    const data = await CommunityAssetMetadata.insertMany(metadata);
    return data.map((d) => d._id);
  }

  /**
   * Create a community asset or if existing add max quantity to the existing asset's max quantity
   * @returns CommunityAsset
   */
  async addQuantityOrCreateAsset(
    _,
    { communityId, assetId, type, maxQuantity }
  ) {
    const asset = await this.getAsset({ asset: assetId, type });
    if (!asset) throw new Error("Invalid asset data");
    const existing = await CommunityAsset.findOne({
      community: communityId,
      asset: assetId,
    });
    if (existing) {
      existing.maxQuantity += maxQuantity;
      const insertedIds = await this.initializeCommunityAssetMetadata(
        existing,
        { maxQuantity }
      );
      existing.metadata = [...(existing.metadata || []), ...insertedIds];
      return await existing.save();
    }
    const communityAsset = new CommunityAsset({
      community: communityId,
      type,
      asset: asset._id,
      maxQuantity,
    });
    const insertedIds = await this.initializeCommunityAssetMetadata(
      communityAsset,
      { maxQuantity }
    );
    communityAsset.metadata = insertedIds;
    return await communityAsset.save();
  }

  async editCommunityAsset(
    communityAsset,
    { metadataId, position, deleteAsset }
  ) {
    if (!communityAsset || !position || !metadataId)
      throw new Error("No more items available!");
    const vector3D = new Vector3D(position);
    const { x, y, z } = vector3D.normalize();
    const communityAssetMetadata = await CommunityAssetMetadata.findById(
      metadataId
    );

    if (!communityAssetMetadata) {
      throw new Error(
        `You can only place ${communityAsset.maxQuantity} of this asset`
      );
    }

    if (deleteAsset) {
      communityAssetMetadata.position = null;
    } else {
      communityAssetMetadata.position = { x, y, z };
    }

    const communityAssetMetadataUpdated = await communityAssetMetadata.save();

    return [communityAsset, communityAssetMetadataUpdated];
  }
}

module.exports = { Service: CommunityAssetService };
