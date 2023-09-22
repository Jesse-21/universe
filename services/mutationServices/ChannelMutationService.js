const { Service: _CommunityService } = require("../CommunityService");
const { Service: ChannelService } = require("../ChannelService");

const { Community } = require("../../models/Community");
const { Channel } = require("../../models/Channel");
const { Account } = require("../../models/Account");
const { Role } = require("../../models/Role");

const { cleanRecipients } = require("../../helpers/clean-recipients");
const {
  getAddressFromEnsOrAddress,
} = require("../../helpers/get-address-from-ens");
const { isENS } = require("../../helpers/validate-and-convert-address");

class ChannelMutationService extends ChannelService {
  constructor() {
    super();
    this.CommunityService = new _CommunityService();
  }

  /**
   * @param {String} recipients an array of strings, each string is a recipient in the format of locale@bebDomain.cast
   * @returns ChannelRecipientsInput[]
   */
  async _convertChannelRecipients({ recipients }) {
    let rawChannelRecipientsInput = [];
    try {
      rawChannelRecipientsInput = cleanRecipients(recipients);
    } catch (error) {
      throw new Error(error.message);
    }

    const channelRecipientsInput = [];
    if (rawChannelRecipientsInput.length) {
      for (let i = 0; i < rawChannelRecipientsInput.length; i++) {
        const { recipientType, locale, domain, tld } =
          rawChannelRecipientsInput[i];
        if (!domain) throw new Error("Invalid recipient, no dimension found");
        let recipientId;
        if (recipientType === 0) {
          // user
          let address = locale;
          if (isENS(locale)) {
            address = await getAddressFromEnsOrAddress(locale);
          }
          const account = await Account.findOrCreateByAddressAndChainId({
            address,
            chainId: 1,
          });
          recipientId = account?._id;
        } else if (recipientType === 1) {
          // role
          const community = await Community.findOne({
            bebdomain: domain,
            tld: tld,
          }).select("_id");
          if (!community) throw new Error(`Invalid domain ${domain}`);
          const role = await Role.findOne({
            slug: locale,
            community: community._id,
          });
          recipientId = role?._id;
        }
        if (recipientId) {
          channelRecipientsInput.push({
            recipientType,
            recipientId,
            slug: `${locale}@${domain}.${tld}`,
            domain: domain,
            tld,
          });
        } else {
          throw new Error(
            `No recipient ${locale} found in ${domain}.${tld}, did you mean to use a different address?`
          );
        }
      }

      return channelRecipientsInput;
    } else {
      return [];
    }
  }

  async _canAdminChannelOrError(channel, props, context) {
    if (!channel) throw new Error("Invalid channel");
    await channel.populate("community");
    const canAdmin = await this.CommunityService.canAdmin(
      channel.community,
      props,
      context
    );
    if (!canAdmin) {
      throw new Error("You do not have permission to edit the channel.");
    }
    return true;
  }

  /**
   * @TODO Take care of recipients based in different dimensions (from recipients array)
   * only take the first recipient for now
   * Create a channel for community if authorized
   * @params {String} communityId
   * @params {ChannelInput} channelInput
   * @params {String[]} recipients
   * @returns Promise<Channel>
   */
  async createChannelForCommunityOrUnauthorized(
    _,
    { channelInput, communityId, recipients = [] },
    context
  ) {
    // const community = await Community.findById(communityId);
    // if (!community) {
    //   throw new Error("Invalid Community");
    // }
    // const canAdmin = await this.CommunityService.canAdmin(
    //   community,
    //   channelInput,
    //   context
    // );

    if (
      process.env.DEFAULT_COMMUNITY_ID &&
      communityId !== process.env.DEFAULT_COMMUNITY_ID &&
      process.env.NODE_ENV !== "test"
    ) {
      throw new Error(
        "You do not have permission to create the channel because DEFAULT_COMMUNITY_ID is set!"
      );
    }
    let recipientsInputs = null;
    if (recipients.length) {
      recipientsInputs = await this._convertChannelRecipients({
        // @TODO only take the first recipient before figuring out how to deliver messages to different channels in different dimensions
        recipients: [recipients[0]],
      });
    }

    // @TODO make it work for multiple recipients
    // forward the channel to the destination domain
    const domain = recipientsInputs?.[0]?.domain;
    const tld = recipientsInputs?.[0]?.tld;

    const destinationCommunity = await Community.findOne({
      bebdomain: domain,
      tld,
    });

    if (!destinationCommunity)
      throw new Error(`Cannot find recipient domain at ${domain}.${tld}`);
    const createdChannel =
      await this.CommunityService.createChannelForCommunity(
        destinationCommunity,
        {
          ...channelInput,
          recipients: recipientsInputs,
        },
        context
      );

    if (!createdChannel.recipients?.length) return createdChannel;

    // implicitly grant all community's permissions to the channel recipients, and deny to everyone else (public role)
    // @TODO remove this to be dynamic depending on arguments (e.g permission: READ only grant read permission)
    const allPermissionStrings =
      await this.CommunityService.getCommunityAllPermissionString(
        destinationCommunity
      );
    return await this.createPermissionOverwritesForChannelRecipients(
      createdChannel,
      {
        allowedPermissionString: allPermissionStrings, // allow all permissions to only recipients
        deniedPermissionString: allPermissionStrings, // deny all permissions to public
      }
    );
  }

  /**
   * Edit a channel if authorized
   * @returns Promise<Channel>
   */
  async editChannelForCommunityOrUnauthorized(
    _,
    { channelId, channelInput },
    context
  ) {
    const channel = await Channel.findById(channelId);
    await this._canAdminChannelOrError(
      channel,
      { channelId, channelInput },
      context
    );

    return await channel.edit(channelInput);
  }
  /**
   * Delete a role if authorized
   * @returns Promise<String>
   */
  async deleteChannelForCommunityOrUnauthorized(_, { channelId }, context) {
    const channel = await Channel.findById(channelId);
    await this._canAdminChannelOrError(channel, { channelId }, context);

    return await channel.delete();
  }
}

module.exports = { Service: ChannelMutationService };
