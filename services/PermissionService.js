const { Permission } = require("../models/Permission");
const BigInt = require("big-integer");

class PermissionService {
  /**
   * Generate a permission string from an array of permission ids
   * @param {ObjectIds[]} permissionIds
   * @returns {string}
   */
  async generatePermissionStringFromIds(permissionIds = []) {
    const permissions = await Permission.find({
      _id: { $in: permissionIds },
    }).select("bitwiseFlag");
    if (!permissions.length) return null;

    const permissionString = permissions.reduce(
      (prev, curr) => (BigInt(prev) | BigInt(curr.bitwiseFlag)).toString(),
      "0"
    );

    return permissionString;
  }

  /**
   * Generate a permission string from an array of permission strings |= (or) ing them together
   * @param {String[]} permissionStrings
   * @returns {string} - final permission string
   */
  combinePermissionStrings(permissionStrings = []) {
    const permissionString = permissionStrings.reduce(
      (prev, curr) => (BigInt(prev) | BigInt(curr)).toString(),
      "0"
    );

    return permissionString;
  }

  /**
   * Given a permission string, check if a permission flag is set
   * @param {string} permissionString
   * @param {string} flag
   * @returns {boolean}
   */
  isFlagSetForPermissionString(permissionString, flag) {
    if (!flag || !permissionString) return false;
    return (
      (BigInt(permissionString) & BigInt(flag)).toString() ===
      BigInt(flag).toString()
    );
  }

  /**
   * Given a permission string, check if a permission id is set
   * @param {string} permissionString
   * @param {ObjectId} permissionId
   * @returns {Promise<boolean>}
   */
  async isFlagSetForPermissionStringById(permissionString, permissionId) {
    const permission = await Permission.findById(permissionId);
    if (!permission || !permissionString) return false;
    return this.isFlagSetForPermissionString(
      permissionString,
      permission.bitwiseFlag
    );
  }
}

module.exports = { Service: PermissionService };
