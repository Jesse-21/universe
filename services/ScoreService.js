const tf = require("@tensorflow/tfjs-node");

class ScoreService {
  static async _getScore(model, inputData) {
    const prediction = model.predict(tf.tensor2d([inputData])).dataSync();
    return prediction[0];
  }

  static async getScore(data, { scoreType = "beb" }) {
    let modelUrl = `file://./services/data/beb_score_model/model.json`;
    if (scoreType === "farcaster") {
      modelUrl = `file://./services/data/farcaster_score_model/model.json`;
    }
    const model = await tf.loadLayersModel(modelUrl);

    const inputData = [...data];

    return await ScoreService._getScore(model, inputData);
  }
}

module.exports = { Service: ScoreService };
