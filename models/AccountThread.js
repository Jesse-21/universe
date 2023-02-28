const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/accountThread");

class AccountThreadClass {
  static ping() {
    console.log("model: AccountThreadClass");
  }

  static _buildAccountThreadMatchQuery(accountId, { filters }) {
    let matchQuery = { account: mongoose.Types.ObjectId(accountId) };
    if (filters.isAccepted !== undefined) {
      matchQuery = {
        ...matchQuery,
        isAccepted: filters.isAccepted,
      };
    }
    return matchQuery;
  }

  /**
   * Find if there is an existing AccountThread by accountId and threadId
   * @returns Promise<AccountThread> || null
   */
  static async _existingAccountThread({ accountId, threadId }) {
    if (!accountId || !threadId) return null;
    return this.findOne({ account: accountId, thread: threadId });
  }

  /**
   * Find an account thread or create a new one
   * @returns Promise<AccountThread>
   */
  // @TODO verify integraty of accountId and threadId
  static async findOrCreate({ accountId, threadId, ...props }) {
    if (!accountId || !threadId) throw new Error("Invalid account or thread");
    const found = await this._existingAccountThread({ accountId, threadId });

    if (found) return found;
    return AccountThread.create({
      account: accountId,
      thread: threadId,
      ...props,
    });
  }

  /**
   * Accept an AccountThread
   * @returns Promise<AccountThread>
   */
  static async acceptAccountThread({ accountId, threadId }) {
    const found = await this._existingAccountThread({ accountId, threadId });
    if (!found) throw new Error("Invalid AccountThread");

    found.isAccepted = true;
    return found.save();
  }

  /**
   * Update an AccountThread's userLastSeen to the current date
   * @returns Promise<AccountThread>
   */
  static async updateAccountThreadLastSeen({ accountId, threadId }) {
    const found = await this._existingAccountThread({ accountId, threadId });
    if (!found) throw new Error("Invalid AccountThread");

    found.userLastSeen = new Date();
    return found.save();
  }

  /**
   * Get other AccountThreads in the same threadId.
   * Optinally, except selfAccountId (useful to get recipients)
   * @returns Promise<AccountThread[]>
   */
  static async getAccountThreadByThread({ exceptSelfId, threadId }) {
    const query = !exceptSelfId // if do not include self
      ? { thread: threadId }
      : { thread: threadId, account: { $ne: exceptSelfId } };
    const accountThreads = await AccountThread.find(query);
    return accountThreads;
  }

  /**
   * Find Account Threads belonging to accountId, sort by the lastest ThreadMessage updated at
   * @returns Promise<AccountThread[]>
   */
  static async findAndSortByLatestThreadMessage(
    accountId,
    { limit = 20, offset = 0, filters = {} } = {}
  ) {
    const matchQuery = this._buildAccountThreadMatchQuery(accountId, {
      filters,
    });

    const accountThreads = await AccountThread.aggregate([
      { $match: matchQuery },
      // grab the most recent created thread messages
      {
        $lookup: {
          from: "threadmessages",
          let: {
            thread: "$thread",
          },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$thread", "$$thread"] } },
            },
            {
              $sort: { createdAt: -1, _id: 1 },
            },
            {
              $limit: 1,
            },
          ],
          as: "threadMessages",
        },
      },
      // add the last thread message as a field in account thread
      {
        $addFields: {
          latestMessage: { $arrayElemAt: ["$threadMessages", 0] },
        },
      },
      // sort account thread by last created thread messages
      { $sort: { "latestMessage.createdAt": -1, _id: 1 } },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);
    return accountThreads;
  }
}

schema.loadClass(AccountThreadClass);

const AccountThread =
  mongoose.models.AccountThread || mongoose.model("AccountThread", schema);

module.exports = {
  AccountThread,
};
