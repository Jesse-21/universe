const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const dotenv = require("dotenv");
dotenv.config();

const createDb = async () => {
  const mongod = await MongoMemoryServer.create();
  return {
    /**
         * Connect to the in-memory database.
         */
    connect: async () => {
      const uri = await mongod.getUri();

      const mongooseOpts = {
        useNewUrlParser: true,
      };

      await mongoose.connect(uri, mongooseOpts);
    },
    /**
         * Drop database, close the connection and stop mongod.
         */
    closeDatabase: async () => {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
      await mongod.stop();
    },
    /**
         * Remove all the data for all db collections.
         */
    clearDatabase: async () => {
      const collections = mongoose.connection.collections;

      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany();
      }
    },
  };
};

module.exports = { createDb };
