const mongoose = require("mongoose");
const { PubSub } = require("graphql-subscriptions");
const EventEmitter = require("events").EventEmitter;

class Messenger extends EventEmitter {
  constructor(options) {
    super();
    const o = options || {};
    if (o.mongooseOptions) {
      this.mongooseOptions = o.mongooseOptions;
    }
    const mongoose = o.mongoose || require("mongoose");
    this.mongoose = mongoose;

    const MessageSchema = new this.mongoose.Schema({
      channel: String,
      createdAt: { type: Date, expires: "15s", default: Date.now },
      message: mongoose.Schema.Types.Mixed,
    });
    this.Message =
      mongoose.models["PubSubMessage"] ||
      mongoose.model("PubSubMessage", MessageSchema);
    this.subscribed = {};
    this.lastMessageId = null;
    this.lastMessageTimestamp = null;
    this.startingMessageTimestamp = new Date();
    this.retryInterval = o.retryInterval || 100;
  }

  send(channel, msg, callback) {
    const cb = typeof callback === "function" ? callback : function noop() {};
    const message = new this.Message({
      channel: channel,
      message: msg,
    });
    message.save(cb);
  }

  connect(callback) {
    if (this.mongoose.connection.readyState === 0 && this.mongooseOptions) {
      this.mongoose.connect(
        this.mongooseOptions.url,
        this.mongooseOptions.options
      );
    }

    const pipeline = [
      {
        $match: {
          $or: [{ operationType: "insert" }],
        },
      },
    ];
    let stream = this.Message.watch(pipeline, { fullDocument: "updateLookup" });

    stream.on("change", (doc) => {
      const { fullDocument } = doc;
      if (
        fullDocument &&
        this.subscribed[fullDocument.channel] &&
        this.lastMessageId !== fullDocument._id
      ) {
        this.lastMessageId = fullDocument._id;
        this.lastMessageTimestamp = fullDocument.createdAt;
        this.emit(fullDocument.channel, fullDocument.message);
      }
    });

    const reconnect = () => {
      if (stream && stream.destroy) {
        stream.destroy();
      }
      stream = null;
      setTimeout(() => {
        this.connect();
      }, 10000);
    };

    stream.on("error", reconnect);
    stream.on("close", reconnect);

    if (callback) callback();
  }

  subscribe(channel, bool) {
    if (channel && bool) {
      this.subscribed[channel] = bool;
      return;
    }
    if (channel && this.subscribed[channel]) {
      delete this.subscribed[channel];
    }
  }
}

const defaultCommonMessageHandler = (message) => message;

class MongodbPubSub extends PubSub {
  constructor(options = {}) {
    const { commonMessageHandler } = options;
    super();
    this.ee = new Messenger(options);
    this.subscriptions = {};
    this.subIdCounter = 0;
    this.commonMessageHandler =
      commonMessageHandler || defaultCommonMessageHandler;
    this.ee.connect();
  }
  async publish(triggerName, payload) {
    this.ee.send(triggerName, payload);
    return Promise.resolve(true);
  }
  async subscribe(triggerName, onMessage) {
    const callback = (message) => {
      onMessage(
        message instanceof Error ? message : this.commonMessageHandler(message)
      );
    };
    this.subIdCounter = this.subIdCounter + 1;
    this.subscriptions[this.subIdCounter] = [triggerName, callback];
    this.ee.subscribe(triggerName, true);
    this.ee.addListener(triggerName, callback);
    return Promise.resolve(this.subIdCounter);
  }
  unsubscribe(subId) {
    if (this.subscriptions[subId]) {
      const [triggerName, callback] = this.subscriptions[subId];
      delete this.subscriptions[subId];
      this.ee.removeListener(triggerName, callback);
      this.ee.subscribe(triggerName, false);
    }
  }
}

module.exports = {
  MongodbPubSub,
  Messenger,
  connectDB: () => {
    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL env var not set");
    }
    return new Promise((resolve, reject) => {
      if (
        mongoose.connection.readyState == mongoose.ConnectionStates.connected
      ) {
        return resolve();
      }
      mongoose.set("strictQuery", true);
      mongoose
        .connect(process.env.MONGO_URL, {
          useNewUrlParser: true,
        })
        .then(() => {
          console.log("Mongoose up!");
          resolve();
        })
        .catch((e) => {
          console.log("Something went wrong with mongo:", e);
          reject(e);
        });
    });
  },
};
