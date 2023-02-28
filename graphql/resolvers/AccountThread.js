const { Account } = require("../../models/Account");
const { Thread } = require("../../models/Thread");

const resolvers = {
  AccountThread: {
    account: async (parent) => {
      const account = await Account.findById(parent.account);
      return account;
    },
    thread: async (parent) => {
      const thread = await Thread.findById(parent.thread);
      return thread;
    },
    latestMessage: async (parent) => {
      if (parent.latestMessage) return parent.latestMessage;
      const message = await Thread.getMessages(parent.thread, { limit: 1 });
      return message?.[0] || null;
    },
  },
};

module.exports = { resolvers };
