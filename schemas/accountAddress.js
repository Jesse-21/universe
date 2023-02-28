/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: chainSchema } = require("./chain");

const schema = mongoose.Schema({
  address: { type: String, index: true, required: true }, // the address on chainId
  chain: chainSchema, // the chain associated with the address
  account: {
    type:mongoose.Schema.Types.ObjectId,
    ref:"Account",
    index: true,
  },
});

module.exports = { schema };