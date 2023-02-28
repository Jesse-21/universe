/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * Permissions overwrite that are associated to one user or one role
 */
const schema = mongoose.Schema(
  {
    /** The id of object type, i.e a role Id or a User Id */
    objectTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      required: true,
    },

    // const objectType = {
    //     0: user,
    //     1: role,
    // }
    objectType: { type: Number, index: true, required: true },

    /** Implicitely allow permissions string, final permission computed by or (|=) with base permission */
    allowedPermissionString: { type: String },
    /** Implicitely deny permissions string, final permission computed by or (&=) with base permission */
    deniedPermissionString: { type: String },
  },
  { timestamps: true }
);

module.exports = { schema };
