/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: chainSchema } = require("./chain");

/**
 * An address. Does not have to be an accountAddress - can be a contract address etc
 */
const schema = mongoose.Schema({
  address: { type: String, index: true, required: true }, // the address on chainId
  chain: chainSchema, // the chain associated with the address
});

module.exports = { schema };
