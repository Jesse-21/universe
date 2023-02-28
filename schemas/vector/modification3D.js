/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: vector3DSchema } = require("./vector3D");

/**
 * A asset modification schema at 2 decimal precision
 */
const schema = mongoose.Schema({
  scale: vector3DSchema,
  rotation: vector3DSchema,
  transition: vector3DSchema,
});

module.exports = { schema };
