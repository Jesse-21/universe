/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: contentSchema } = require("./content");
const { schema: richContentBlock } = require("./richContentBlock");

/**
 * A rich content is content with extra props
 * useful for when the user can attach things to their content
 * i.e image, video, celebration...
 * can add different blocks or extension in the future
 */
const schema = mongoose.Schema({
  content: contentSchema,
  blocks: [richContentBlock],
});

module.exports = { schema };
