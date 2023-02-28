const mongoose = require("mongoose");

const { schema } = require("../schemas/metadata");

class MetadataClass {}

schema.loadClass(MetadataClass);

const Metadata = mongoose.models.Metadata || mongoose.model("Metadata", schema);

module.exports = {
  Metadata,
};
