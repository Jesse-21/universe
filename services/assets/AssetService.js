const { Service: _RichBlockService } = require("../RichBlockService");

/**
 * Asset service common to all assets
 * @type ASSET: ASSET3D |
 */
class AssetService {
  /**
   * Add a component to an asset
   * @returns Asset
   */
  async addComponent(asset, { type, ...props }) {
    if (!asset) throw new Error("Invalid asset data");
    const RichBlockService = new _RichBlockService();
    const component = await RichBlockService.createBlock({
      blockType: type,
      ...props,
    });

    if (!component) return asset;

    const components = [
      ...(asset.components || []),
      {
        blockId: component._id,
        blockType: type,
      },
    ];
    asset.components = components;

    return await asset.save();
  }
}

module.exports = { Service: AssetService };
