const tf = require("@tensorflow/tfjs-node");
const { Service: _CacheService } = require("../services/cache/CacheService");

class ScoreService {
  static async _getScore(model, inputData) {
    const prediction = model.predict(tf.tensor2d([inputData])).dataSync();
    return prediction[0];
  }

  static async getScore(data, { scoreType = "beb" }) {
    // const inputData = [
    //   num_transactions,
    //   transaction_frequency,
    //   total_value,
    //   unique_counterparties,
    //   age,
    //   activity_level,
    //   total_gas_paid,
    //   num_successful_transactions,
    // ];
    let modelUrl = `file://./services/data/beb_score_model/model.json`;

    if (scoreType === "social") {
      // const inputData = [
      //   fid,
      //   follow_count,
      //   posts_count,
      //   likes_received,
      //   posts_engagement,
      //   viral_post_count,
      //   beb_score,
      // ];
      modelUrl = `file://./services/data/social_score_model/model.json`;
    }
    const model = await tf.loadLayersModel(modelUrl);

    const inputData = [...data];

    return await ScoreService._getScore(model, inputData);
  }

  async setScore({ address, scoreType, score = 300, modifier = null }) {
    const CacheService = new _CacheService();

    const SCORE_KEY = "BebScoreService";

    let finalScore = score;
    if (modifier) {
      const existingScore = await CacheService.get({
        key: SCORE_KEY,
        params: {
          address: address,
          scoreType: scoreType,
        },
      });
      if (existingScore) {
        finalScore = existingScore + modifier;
      } else {
        finalScore = score + modifier;
      }
    }
    finalScore = Math.min(Math.max(finalScore, 300), 850);
    return await CacheService.set({
      key: SCORE_KEY,
      params: {
        address: address,
        scoreType: scoreType,
      },
      value: finalScore,
      // custom scores never expire, so has no expiredAt
    });
  }

  async getCommunityScore({ address, bebdomain }) {
    const CacheService = new _CacheService();

    const SCORE_KEY = "BebScoreService";
    const existingScore = await CacheService.get({
      key: SCORE_KEY,
      params: {
        address: address,
        scoreType: bebdomain,
      },
    });
    if (existingScore) {
      return existingScore;
    } else {
      return 300;
    }
  }
}

module.exports = { Service: ScoreService };
