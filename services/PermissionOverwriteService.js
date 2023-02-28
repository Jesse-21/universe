const { PermissionOverwrite } = require("../models/PermissionOverwrite");
const { Role } = require("../models/Role");
const { Account } = require("../models/Account");

const { Service: PermissionService } = require("./PermissionService");

class PermissionOverwriteService {
  /**
   * create a PermissionOverwrite with an array of permission Ids
   * @param {string} objectType user or role
   * @param {ObjectId} objectTypeId the objectId of the user or role
   * @param {ObjectId[]} permissionIds the permission ids to create the PermissionOverwrite for
   * @returns {Promise<PermissionOverwrite>}
   */
  async createFromPermissionIds({
    objectType = "ROLE",
    objectTypeId,
    permissionIds = [],
    deniedPermissionIds = [],
  }) {
    if (!permissionIds.length && !deniedPermissionIds.length) return null;
    let objectTypeNum = null;

    switch (objectType) {
      case "ROLE": {
        const role = await Role.findById(objectTypeId);
        if (!role) throw new Error("Invalid role");
        objectTypeNum = 1;
        break;
      }
      case "USER": {
        const user = await Account.findById(objectTypeId);
        if (!user) throw new Error("Invalid user");
        objectTypeNum = 0;
        break;
      }
    }

    if (objectTypeNum === null) throw new Error("Invalid objectType");

    const _PermissionService = new PermissionService();
    let allowedPermissionString = null;
    let deniedPermissionString = null;
    if (permissionIds.length) {
      allowedPermissionString =
        await _PermissionService.generatePermissionStringFromIds(permissionIds);
    }
    if (deniedPermissionIds.length) {
      deniedPermissionString =
        await _PermissionService.generatePermissionStringFromIds(
          deniedPermissionIds
        );
    }
    const permissionOverwrite = await PermissionOverwrite.create({
      objectTypeId,
      objectType: objectTypeNum,
      allowedPermissionString,
      deniedPermissionString,
    });
    return permissionOverwrite;
  }
}

module.exports = { Service: PermissionOverwriteService };
