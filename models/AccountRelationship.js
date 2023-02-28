const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/accountRelationship");

class AccountRelationshipClass {
  static ping() {
    console.log("model: AccountRelationshipClass");
  }

  /**
   * Get existing account relationship
   * @returns Promise<AccountRelationship>
   */
  static async _existingAccountRelationship({ from, to }) {
    return this.findOne({ from, to });
  }

  /**
   * Toggle follow from account 'from' to account 'to'
   * @returns Promise<AccountRelationship>
   */
  static async toggleFollow({ from, to }) {
    // @TODO verify account exists?
    const relationship = await this._existingAccountRelationship({
      from,
      to,
    });
    if (relationship) {
      relationship.isFollowing = !relationship.isFollowing;
      await relationship.save();
      return relationship;
    } else {
      const newRelationship = await this.create({
        from,
        to,
        isFollowing: true,
      });
      return newRelationship;
    }
  }

  /**
   * Toggle block from account 'from' to account 'to'
   * @returns Promise<AccountRelationship>
   */
  static async toggleBlock({ from, to }) {
    // @TODO verify account exists?
    const relationship = await this._existingAccountRelationship({
      from,
      to,
    });
    if (relationship) {
      relationship.isBlocking = !relationship.isBlocking;
      await relationship.save();
      return relationship;
    } else {
      const newRelationship = await this.create({
        from,
        to,
        isBlocking: true,
      });
      return newRelationship;
    }
  }

  /**
   * Get two ways relationship from account 'from' to account 'to'
   * @returns Promise<AccountRelationshipTwoWay>
   */
  static async getTwoWayRelationship({ from, to }) {
    const rel1 = await this.findOne({ from, to });
    const rel2 = await this.findOne({ from: to, to: from });

    return {
      from,
      to,
      iFollowThem: !!rel1?.isFollowing,
      theyFollowMe: !!rel2?.isFollowing,
    };
  }

  /**
   * Get account relationships where both accounts follow each other
   * @retusn Promise<AccountRelationshipWithConnection[]>
   */
  static async getConnectedAccountRelationships({ limit, offset, filters }) {
    if (!filters.from) {
      throw new Error(
        "Cannot have excludeNotConnected filter without a from filter"
      );
    }
    const relationships = await AccountRelationship.aggregate([
      {
        $match: {
          to: mongoose.Types.ObjectId(filters.from),
          isFollowing: true, // get all accounts following 'from'
        },
      },
      {
        $lookup: {
          from: "accountrelationships",
          let: {
            from: "$from",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$to", "$$from"] },
                    {
                      $eq: ["$from", mongoose.Types.ObjectId(filters.from)],
                    },
                  ],
                },
              },
            },
            {
              $limit: 1,
            },
          ],
          as: "connections",
        },
      },
      {
        $addFields: {
          connection: { $arrayElemAt: ["$connections", 0] },
        },
      },
      {
        $match: {
          "connection.isFollowing": true,
        },
      },
      { $sort: { updatedAt: -1, _id: 1 } },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);
    return relationships;
  }
  /**
   * Get account relationships with filters
   * @returns Promise<AccountRelationship[]>
   */
  static async getAccountRelationships({ limit = 20, offset = 0, filters }) {
    let matchQuery = {};
    if (filters.from) {
      matchQuery = {
        ...matchQuery,
        from: mongoose.Types.ObjectId(filters.from),
      };
    }
    if (filters.to) {
      matchQuery = {
        ...matchQuery,
        to: mongoose.Types.ObjectId(filters.to),
      };
    }
    if (filters.isFollowing !== undefined) {
      matchQuery = {
        ...matchQuery,
        isFollowing: filters.isFollowing,
      };
    }
    if (filters.excludeNotConnected) {
      return this.getConnectedAccountRelationships({ limit, offset, filters });
    }
    const relationships = await AccountRelationship.aggregate([
      { $match: matchQuery },
      { $sort: { updatedAt: -1, _id: 1 } },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);

    return relationships;
  }
}

schema.loadClass(AccountRelationshipClass);

const AccountRelationship =
  mongoose.models.AccountRelationship ||
  mongoose.model("AccountRelationship", schema);

module.exports = {
  AccountRelationship,
};
