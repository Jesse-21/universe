const { Thread } = require("../../models/Thread");
const { AccountThread } = require("../../models/AccountThread");
const { ThreadTransaction } = require("../../models/ThreadTransaction");

const resolvers = {
  ThreadTransaction: {
    thread: async (parent) => {
      const thread = await Thread.findById(parent.thread);
      return thread;
    },
    sender: async (parent, _args, context) => {
      const account = await context.dataloaders.accounts.load(parent.sender);
      return account;
    },
    recipient: async (parent, _args, context) => {
      const account = await context.dataloaders.accounts.load(parent.recipient);
      return account;
    },
  },
  ThreadMessage: {
    thread: async (parent) => {
      const thread = await Thread.findById(parent.thread);
      return thread;
    },
    sender: async (parent, _args, context) => {
      const account = await context.dataloaders.accounts.load(parent.sender);
      return account;
    },
  },
  Thread: {
    messages: async (parent, args) => {
      const messages = await Thread.getMessages(parent._id, args);
      return messages;
    },
    transactions: async (parent) => {
      const transactions = await ThreadTransaction.find({ thread: parent._id });
      return transactions;
    },
    recipients: async (parent, args, context) => {
      const accounts = await Thread.getRecipientsByThreadId({
        threadId: parent._id,
        exceptSelfId: context.accountId,
      });
      return accounts;
    },
    recipientAccountThreads: async (parent, args, context) => {
      const recipientAccountThreads =
        await AccountThread.getAccountThreadByThread({
          exceptSelfId: context.accountId,
          threadId: parent._id,
        });
      return recipientAccountThreads;
    },
  },
};

module.exports = { resolvers };
