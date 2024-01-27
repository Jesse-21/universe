const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/score");
const { getMemcachedClient } = require("../connectmemcached");

const padWithZeros = (numberString) => {
  const maxLength = 32;
  while (numberString.length < maxLength) {
    numberString = "0" + numberString;
  }
  return numberString;
};

class ScoreClass {
  static ping() {
    console.log("model: ScoreClass");
  }

  static async getLeaderboard(scoreType, limit = 10) {
    const memcached = getMemcachedClient();
    try {
      const data = await memcached.get(
        `ScoreClass:getLeaderboard:${scoreType}:${limit}`
      );
      if (data) {
        return JSON.parse(data.value);
      }
    } catch (e) {
      console.error(e);
    }

    const leaderboard = await Score.aggregate([
      { $match: { scoreType: scoreType } },
      { $sort: { score: -1 } },

      {
        $lookup: {
          from: "accountaddresses", // The name of the AccountAddress collection in MongoDB
          localField: "address",
          foreignField: "address",
          as: "accountAddress",
        },
      },
      { $unwind: "$accountAddress" },
      {
        $lookup: {
          from: "accounts", // The name of the Account collection in MongoDB
          localField: "accountAddress.account",
          foreignField: "_id",
          as: "account",
        },
      },
      { $unwind: "$account" },

      // // Filter out documents where 'account.recoverers' is not an array of size at least 1
      {
        $match: { "account.recoverers": { $exists: true, $not: { $size: 0 } } },
      },
      { $limit: parseInt(limit) },
      // Optionally add a projection to format the output
      { $project: { score: 1, address: 1, account: 1 } },
    ]);

    const cleanedLeaderboard = leaderboard.map((entry) => ({
      ...entry,
      score: entry.score.replace(/^0+/, ""),
    }));
    try {
      await memcached.set(
        `ScoreClass:getLeaderboard:${scoreType}:${limit}`,
        JSON.stringify(cleanedLeaderboard),
        { lifetime: 60 * 60 } // 1 hour
      );
    } catch (e) {
      console.error(e);
    }
    return JSON.parse(JSON.stringify(cleanedLeaderboard));
  }
}

schema.post("find", function (docs) {
  for (let doc of docs) {
    doc.score = doc.score.replace(/^0+/, ""); // This will remove all leading zeros
  }
});

schema.post("findOne", function (doc) {
  if (doc) {
    doc.score = doc.score.replace(/^0+/, ""); // This will remove all leading zeros
  }
});

schema.loadClass(ScoreClass);

const Score = mongoose.models.Score || mongoose.model("Score", schema);

module.exports = {
  Score,
  padWithZeros,
};
