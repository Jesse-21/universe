const tf = require("@tensorflow/tfjs-node");

class ScoreService {
  static async _getEthereumScore(model, inputData) {
    const prediction = model.predict(tf.tensor2d([inputData])).dataSync();
    return prediction[0];
  }

  static async getScore(data) {
    const model = await tf.loadLayersModel(
      `file://./services/data/ethereum_score_model/model.json`
    );

    const inputData = [...data];

    return await ScoreService._getEthereumScore(model, inputData);
  }
}

module.exports = { Service: ScoreService };
