const tf = require("@tensorflow/tfjs-node");

class ScoreService {
  static async _getEthereumScore(model, inputData) {
    const prediction = model.predict(tf.tensor2d([inputData])).dataSync();
    return prediction[0];
  }

  static async getScore(address) {
    const model = await tf.loadLayersModel(
      `file://./services/data/ethereum_score_model/model.json`
    );

    const data = {
      // default to example data (jcdenton.eth)
      num_transactions: 362,
      transaction_frequency: 0.6006602902179918,
      total_value: 67.36201197409075,
      unique_counterparties: 84,
      age: 602.6701047086412,
      total_gas_paid: 1.7035700659938984,
      num_successful_transactions: 359,
      activity_level: 0.609177441393978,
      address,
    };

    const inputData = [
      data.num_transactions,
      data.transaction_frequency,
      data.total_value,
      data.unique_counterparties,
      data.age,
      data.activity_level,
      data.total_gas_paid,
      data.num_successful_transactions,
    ];

    return await ScoreService._getEthereumScore(model, inputData);
  }
}

module.exports = { Service: ScoreService };
