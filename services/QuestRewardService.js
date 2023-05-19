const { Asset3D } = require("../models/assets/Asset3D");
const { Image } = require("../models/Image");

class QuestRewardService {
  /**
   * Create a Quest Reward Item
   * @returns Promise<QuestRewardItem>
   * */
  async createQuestRewardItem({ type, data: rewardData }) {
    let asset = null;
    try {
      switch (type) {
        case "ASSET_3D": {
          asset = await Asset3D.create({
            url: rewardData.url,
            format: rewardData.format,
            assetType: rewardData.assetType,
            name: rewardData.name,
            previewImage: rewardData.previewImage,
          });
          break;
        }
        case "IMAGE": {
          asset = await Image.create({
            src: rewardData.src,
            isVerified: !!rewardData.isVerified,
            verificationOrigin: rewardData.verifyOrigin,
            verificationTokenId: rewardData.verificationTokenId,
            verificationChainId: rewardData.verificationChainId,
            verificationContractAddress: rewardData.verificationContractAddress,
            verificationExternalUrl: rewardData.verificationExternalUrl,
            name: rewardData.name,
          });
          break;
        }
        default:
          return null;
      }
      return asset;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get a Quest Reward Item
   * @returns Promise<QuestRewardItem>
   * */
  async getQuestRewardItem({ rewardId, type }) {
    let asset = null;
    switch (type) {
      case "ASSET_3D": {
        asset = await Asset3D.findById(rewardId);
        break;
      }
      case "IMAGE": {
        asset = await Image.findById(rewardId);
        break;
      }
      default:
        return null;
    }
    return asset;
  }
}

module.exports = { Service: QuestRewardService };
