// Disable due to expensive overhead
// const tf = require("@tensorflow/tfjs-node");
const { Service: _CacheService } = require("../services/cache/CacheService");
const { Score, padWithZeros } = require("../models/Score");
const {
  validateAndConvertAddress,
} = require("../helpers/validate-and-convert-address");
class ScoreService {
  static async getScore(data, { scoreType = "beb" }) {
    return 0;
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

  /**
   * Set a record for each time an address score changes
   * @returns {Promise<KeyValueCache>}
   */
  async _setScoreRecord({ address, scoreType, score = 0 }) {
    const CacheService = new _CacheService();

    const SCORE_KEY = "BebScoreServiceRecord";

    const record = await CacheService.setWithDupe({
      key: SCORE_KEY,
      params: {
        address: address,
        scoreType: scoreType,
      },
      value: score,
      // custom scores never expire, so has no expiredAt
    });
    return record;
  }

  async setScore({ address, scoreType, score = 0, modifier = null }) {
    const CacheService = new _CacheService();
    const cleanAddress = validateAndConvertAddress(address);

    const SCORE_KEY = "BebScoreService";

    let finalScore = score;
    if (modifier) {
      const existingScore = await this.getCommunityScore({
        address: cleanAddress,
        bebdomain: scoreType,
      });
      if (existingScore) {
        finalScore = parseInt(existingScore) + modifier;
      } else {
        finalScore = score + modifier;
      }
    }
    finalScore = Math.min(Math.max(finalScore, 0), Number.MAX_SAFE_INTEGER);
    this._setScoreRecord({
      address: cleanAddress,
      scoreType: scoreType,
      score: finalScore,
    });
    await Score.updateOne(
      {
        address: cleanAddress,
        scoreType: scoreType,
      },
      {
        address: cleanAddress,
        scoreType: scoreType,
        score: padWithZeros(finalScore.toString()),
      },
      {
        upsert: true,
      }
    );
    return await CacheService.set({
      key: SCORE_KEY,
      params: {
        address: cleanAddress,
        scoreType: scoreType,
      },
      value: finalScore,
      expiresAt: null,
    });
  }

  async getCommunityScore({ address, bebdomain }) {
    const CacheService = new _CacheService();
    const cleanAddress = validateAndConvertAddress(address);
    const score = await Score.findOne({
      address: cleanAddress,
      scoreType: bebdomain,
    });
    if (score) return parseInt(score.score);

    const SCORE_KEY = "BebScoreService";
    const existingScore = await CacheService.get({
      key: SCORE_KEY,
      params: {
        address: cleanAddress,
        scoreType: bebdomain,
      },
    });
    if (existingScore) {
      return existingScore;
    } else {
      return 0;
    }
  }
}

module.exports = { Service: ScoreService };
