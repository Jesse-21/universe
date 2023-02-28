const { Permission } = require("../models/Permission");
const { Channel } = require("../models/Channel");
const { ChannelRecipient } = require("../models/ChannelRecipient");
const { Role } = require("../models/Role");

const { Service: _PermissionService } = require("./PermissionService");
class CommunityService {
  /**
   * Verify if an Account can have admin permission like edit in the community
   * only return true if the account is the community owner (for now).
   * @TODO add admin permission for community
   * @returns Promise<Boolean>
   * */
  async canAdmin(community, args, context) {
    if (!context.account || !community?.owner) return false;
    const accountId = context.account._id;

    const isCommunityOwner =
      accountId.toString() === community.owner.toString();
    if (isCommunityOwner) return true;

    return false;
  }

  /**
   * create a permission for an existing community, and insert into the community's permissions array
   * @param {Community} community
   * @param {string} name the permission's name
   * @param {Content} description the permission's description
   * @param {boolean} editable whether the permission is editable by the community owner
   * @returns {Promise<Permission>}
   */
  async createPermissionForCommunity(
    community,
    { name, description, editable, uniqueIdentifier }
  ) {
    if (!community) throw new Error("Invalid community");

    const permission = await Permission.create({
      communityId: community._id,
      name,
      description,
      editable,
      uniqueIdentifier,
      bitwisePosition: community.permissions?.length || 0,
    });
    community.permissions.push(permission);
    await community.save();
    return permission;
  }

  /**
   * create a channel
   * for an existing community, and insert into the community's channel array
   * @param {Community} community
   * @param {string} name the channel's name
   * @param {Content} description the channel's description
   * @param {PartialChannelRecipient[]} recipients the channel's recipients
   * @param {ObjectId} iconId the channel's icon
   * @returns {Promise<Channel>}
   */
  async createChannelForCommunity(
    community,
    { name, description, recipients = [] },
    context = {}
  ) {
    if (!community) throw new Error("Invalid community");

    const channel = await Channel.create({
      communityId: community._id,
      name,
      description,
      createdBy: context.account?._id || context.accountId,
    });
    community.channels.push(channel);
    await community.save();

    if (recipients.length > 0) {
      // create a special owner recipient for the channel creator
      const recipientsToCreate = [...recipients];
      recipientsToCreate.push({
        recipientId: context.account?._id || context.accountId,
        recipientType: 0,
        slug: "owner",
      });
      try {
        const channelRecipients = await Promise.all(
          recipientsToCreate.map(async (recipient) => {
            const obj = await ChannelRecipient.create({
              channel: channel._id,
              recipientId: recipient.recipientId,
              recipientType: recipient.recipientType,
              slug: recipient.slug,
            });
            return obj._id;
          })
        );
        channel.recipients = channelRecipients;
        await channel.save();
      } catch (e) {
        throw new Error(`Error creating channel recipients: ${e.message}`);
      }
    }

    return channel;
  }
  /**
   * create a role with position = community.roles.length
   * for an existing community, and insert into the community's role array
   * @param {Community} community
   * @param {string} name the role's name
   * @param {Content} description the role's description
   * @param {ObjectId} iconId the role's icon
   * @param {String} color the role's hex color string
   * @param {Boolean} isManagedByIndexer if the role is managed by the indexer
   * @returns {Promise<Role>}
   */
  async createRoleForCommunity(
    community,
    { name, description, iconId, color, isManagedByIndexer, editable }
  ) {
    if (!community) throw new Error("Invalid community");
    const role = await Role.create({
      communityId: community._id,
      name,
      description,
      iconId: iconId,
      position: community.roles?.length || 0,
      color,
      isManagedByIndexer,
      editable: !!editable,
    });
    community.roles.push(role);
    await community.save();
    return role;
  }
  /**
   * Get all of a community's permissions in a permission string
   * useful for allowing or denying all permissions
   * @param {communityId} communityId
   * @returns {string} - final permission string
   */
  async getCommunityAllPermissionString(community) {
    if (!community?._id) return null;

    const permissions = await Permission.find({
      community: community._id,
    }).select("bitwiseFlag");

    const PermissionService = new _PermissionService();

    const permissionStrings = permissions.map((p) => p.bitwiseFlag);

    const finalPermissionString =
      PermissionService.combinePermissionStrings(permissionStrings);

    return finalPermissionString;
  }

  /**
   * delete a role from an existing community
   * @param {Community} community
   * @param {ObjectId} roleId the role's id
   */
  // async deleteRoleForCommunity(
  //   community,
  //   { name, description, iconId, color, isManagedByIndexer, editable }
  // ) {
  //   if (!community) throw new Error("Invalid community");
  //   const role = await Role.create({
  //     communityId: community._id,
  //     name,
  //     description,
  //     iconId: iconId,
  //     position: community.roles?.length || 0,
  //     color,
  //     isManagedByIndexer,
  //     editable,
  //   });
  //   community.roles.push(role);
  //   await community.save();
  //   return role;
  // }
}

module.exports = { Service: CommunityService };
