const {
  Service: _PermissionOverwriteService,
} = require("./PermissionOverwriteService");

const { PermissionOverwrite } = require("../models/PermissionOverwrite");
const { Role } = require("../models/Role");

class ChannelService {
  async geChannelPermissionOverwrites(channel) {
    if (!channel) return [];

    const permissionOverwrites = await PermissionOverwrite.find({
      _id: { $in: channel.permissionsOverwrite },
    });
    return permissionOverwrites;
  }

  async getPermissionOverwriteForChannel(
    channel,
    { objectType, objectTypeId }
  ) {
    const permissionOverwrite = await PermissionOverwrite.findOne({
      objectType,
      objectTypeId,
      _id: { $in: channel.permissionsOverwrite },
    });
    return permissionOverwrite;
  }
  /**
   * Create permission overwrites for channel recipients
   * @param {Channel} channel
   * @param {string} deniedPermissionString the permission string to deny to all accounts
   * @param {string} allowedPermissionString the permission string to allow to channel recipients
   */
  async createPermissionOverwritesForChannelRecipients(
    channel,
    { deniedPermissionString, allowedPermissionString }
  ) {
    if (!channel || !channel.community)
      throw new Error("Missing params id and community");
    // 1. deny permission for all accounts
    const publicRole = await Role.findDefaultPublicRoleForCommunity({
      communityId: channel.community,
    });
    const permissionOverwrites = [
      {
        objectTypeId: publicRole._id,
        objectType: 1, // 1: role, 0: account
        deniedPermissionString: deniedPermissionString, // deny permission
      },
    ];

    // 2. allow permission for channel recipients
    await channel.populate("recipients");

    const channelRecipients = channel.recipients;

    for (const recipient of channelRecipients) {
      permissionOverwrites.push({
        objectTypeId: recipient.recipientId,
        objectType: recipient.recipientType,
        allowedPermissionString: allowedPermissionString, // allow permission
      });
    }

    // 3. create permission overwrites
    await this.createPermissionOverwrites(channel, permissionOverwrites);

    return channel;
  }

  /**
   * create a PermissionOverwrite for an existing channel, and insert into the channel's permissionOverwrites array
   * @param {Channel} channel
   * @param {string} objectType USER or ROLE
   * @param {ObjectId} objectTypeId the objectId of the user or role
   * @param {ObjectId[]} permissionIds the permission ids to implicitly allow
   * @param {ObjectId[]} deniedPermissionIds the permission ids to implicitly deny
   * @returns {Promise<PermissionOverwrite>}
   */
  async createPermissionOverwriteForChannel(
    channel,
    {
      objectType = "ROLE",
      objectTypeId,
      permissionIds = [],
      deniedPermissionIds = [],
    }
  ) {
    if (!channel) throw new Error("Invalid params");

    const PermissionOverwriteService = new _PermissionOverwriteService();
    const permissionOverwrite =
      await PermissionOverwriteService.createFromPermissionIds({
        objectType,
        objectTypeId,
        permissionIds,
        deniedPermissionIds,
      });
    if (permissionOverwrite) {
      channel.permissionsOverwrite.push(permissionOverwrite);
      await channel.save();
      return permissionOverwrite;
    } else {
      return null;
    }
  }

  /**
   * Create many PermissionOverwrite for an existing channel, and insert into the channel's permissionOverwrites array
   * 🚨 Use with caution, this assumes that the permissionOverwrite is valid 🚨
   * @param {Channel} channel
   * @param {PartialPermissionOverwriteInput[]} permissionOverwrites[] an array of PartialPermissionOverwriteInput
   * @define {PartialPermissionOverwriteInput} {
   * objectType: string, // 0 for user, 1 for role
   * objectTypeId: ObjectId, // the objectId of the user or role
   * allowedPermissionString: string, // the permission string to implicitly allow
   * deniedPermissionString: string, // the permission string to implicitly deny
   * }
   */
  async createPermissionOverwrites(channel, permissionOverwritesInputs = []) {
    if (!channel) throw new Error("Invalid params");
    const permissionOverwrites = await Promise.all(
      permissionOverwritesInputs
        .filter(
          (po) =>
            po.objectTypeId && (po.objectType === 1 || po.objectType === 0)
        )
        .map(async (permissionOverwrite) => {
          return await PermissionOverwrite.create({
            objectTypeId: permissionOverwrite.objectTypeId,
            objectType: permissionOverwrite.objectType,
            allowedPermissionString:
              permissionOverwrite.allowedPermissionString,
            deniedPermissionString: permissionOverwrite.deniedPermissionString,
          });
        })
    );
    channel.permissionsOverwrite = [
      ...channel.permissionsOverwrite,
      ...permissionOverwrites,
    ];
    await channel.save();
    return permissionOverwrites;
  }
}

module.exports = { Service: ChannelService };
