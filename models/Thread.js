const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { AccountThread } = require("./AccountThread");
const { ThreadTransaction } = require("./ThreadTransaction");
const { ThreadMessage } = require("./ThreadMessage");
const { Account } = require("./Account");
const { AccountNonce } = require("./AccountNonce");

const { schema } = require("../schemas/thread");

class ThreadClass {
  static ping() {
    console.log("model: ThreadClass");
  }
  /** @returns Error or true */
  static async _accountExistCheck(accountId) {
    const existing = await Account.exists({ _id: accountId });
    if (!existing) throw new Error("Invalid Account");
    return true;
  }

  /**
   * Check if there is an existing thread between 2 accountIds
   * @returns [Thread, AccountThreads[]] | []
   * */
  static async _existingThreadBetweenAccounts({ accountIdOne, accountIdTwo }) {
    const accountOneAccountThreads = await AccountThread.find({
      account: accountIdOne,
    });
    const accountOneThreads = accountOneAccountThreads.map((at) => at.thread);

    const accountThreadBetweenAccounts = await AccountThread.findOne({
      thread: { $in: accountOneThreads },
      account: accountIdTwo,
    });

    if (accountThreadBetweenAccounts?.thread) {
      const thread = await Thread.findById(
        accountThreadBetweenAccounts?.thread
      );
      const accounOneAccountThread = accountOneAccountThreads.find(
        (at) => at.thread.toString() === thread._id.toString()
      );
      return [thread, [accounOneAccountThread, accountThreadBetweenAccounts]];
    }
    return [];
  }

  /**
   * Create a thread from account to recipients
   * @returns Promise[Thread, AccountThread[]]
   */
  static async createThread({
    fromAccountId,
    recipientAddress,
    recipientChainId,
  }) {
    /** step 0: verify sender is valid and recipient is valid */
    /** the recipient does not need an account */
    await Thread._accountExistCheck(fromAccountId);
    const recipient = await Account.findOrCreateByAddressAndChainId({
      address: recipientAddress,
      chainId: recipientChainId,
    });
    if (recipient._id.toString() === fromAccountId.toString())
      throw new Error("Cannot create a thread with same recipient as sender");
    /** step 0 if existing thread between accounts return */
    const existings = await Thread._existingThreadBetweenAccounts({
      accountIdOne: fromAccountId,
      accountIdTwo: recipient._id,
    });
    if (existings.length) return existings;
    /** step1: create a Thread if there are no existing threads between accounts*/
    const thread = await Thread.create({});

    /** step2: create 2 AccountThreads: one for recipient, one for sender */
    const accountThreadForSender = await AccountThread.findOrCreate({
      threadId: thread._id,
      accountId: fromAccountId,
      isAccepted: true,
    });

    /** step3: determine isAccepted by account settings and follow settings */
    const accountThreadForRecipient = await AccountThread.findOrCreate({
      threadId: thread._id,
      accountId: recipient._id,
      isAccepted: false, //@TODO
    });

    /** Do not change the index for account threads.
     * The first (index [0]) is the sender account thread,
     * the second (index [1]) is the recipient account thread*/
    return [thread, [accountThreadForSender, accountThreadForRecipient]];
  }

  /**
   * Get recipients/accounts for a thread
   * @returns Promise<Account[]>
   */
  static async getRecipientsByThreadId({ threadId, exceptSelfId }) {
    const accountThreads = await AccountThread.getAccountThreadByThread({
      threadId,
      exceptSelfId,
    });
    const accounts = await Promise.all(
      accountThreads.map((at) => {
        return new Promise((resolve, reject) => {
          Account.findById(at.account).exec((err, acc) => {
            if (err) return reject(err);
            return resolve(acc);
          });
        });
      })
    );

    return accounts;
  }

  /**
   * Get all messages for thread
   * @returns Promise<ThreadMessage[]>
   */
  static async getMessages(
    threadId,
    { limit = 20, offset = 0, sort = "-createdAt" } = {}
  ) {
    return ThreadMessage.find({ thread: threadId })
      .sort(sort)
      .skip(offset)
      .limit(limit);
  }

  /**
   * Create a thread with thread transaction and signed stakes
   * @returns [thread, ThreadTransaction]
   */
  static async createStakedThread({
    recipientAddress,
    recipientChainId,
    senderId,
    nonce,
    tokenAmount,
    signature,
    transactionHash,
  }) {
    const [thread, accountThreads] = await this.createThread({
      fromAccountId: senderId,
      recipientAddress,
      recipientChainId,
    });
    const recipientId = accountThreads?.[1]?.account;
    const threadTransaction = await ThreadTransaction.createNewStake({
      nonce,
      tokenAmount,
      signature,
      transactionHash,
      threadId: thread._id,
      recipientId,
      senderId,
    });
    await AccountNonce.generateNewTransactionNonceByAccountId(senderId);
    return [thread, threadTransaction];
  }
}

schema.loadClass(ThreadClass);

const Thread = mongoose.models.Thread || mongoose.model("Thread", schema);

module.exports = {
  Thread,
};
