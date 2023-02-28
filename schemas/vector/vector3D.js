/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * A vector 3D with x, y, z at 2 decimal precision
 */
const schema = mongoose.Schema({
  x: { type: Number },
  y: { type: Number },
  z: { type: Number }, // e.g 1120 is 11.20
});

module.exports = { schema };
