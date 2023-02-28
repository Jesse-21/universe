/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: contentSchema } = require("./content");

/** @TODO maybe add a "type" field to denote if permission is community level or channel level */
const schema = mongoose.Schema(
  {
    description: contentSchema,
    name: { type: String, required: true },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Community",
    },
    /** An optional identifier to easily reference the permission, i.e "ADMIN" or "ID-1234" */
    uniqueIdentifier: { type: String, index: true },
    /** default permissions like Read and Write cannot be edited or deleted */
    editable: { type: Boolean, default: false },
    /** the unique bitwise permission flag to identify the permission. not editable. */
    /** i.e READ is "2" (1 << 1) */
    /** see https://discord.com/developers/docs/topics/permissions */
    bitwiseFlag: { type: String, required: true, index: true },
    /** The position of the permission determine its bitwise flag
     * for example, if position is 2, the bitwise flag is "4" (1 << 2) */
    bitwisePosition: { type: Number, required: true, index: true },
  },
  { timestamps: true }
);

module.exports = { schema };
