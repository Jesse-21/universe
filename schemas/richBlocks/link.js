/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * A link block
 */
const schema = mongoose.Schema({
  url: { type: String, index: true },
  image: { type: String }, // the preview image scraped from open graph
  title: { type: String }, // the link title scraped from open graph
  description: { type: String }, // the description scraped from open graph
  logo: { type: String }, // the logo scraped from open graph
  iframe: { type: String }, // the iframe scraped from supported the oEmbed like Twitter
});

module.exports = { schema };
