const { Service: AccountService } = require("../AccountService");

class CurrentAccountPermissionService extends AccountService {
  /**
   * Get current account permissions
   * @returns Promise<CurrentAccountPermission>
   * */
  currentAccountPermissions(parent, args, context) {
    const communityId = args?.communityId;
    const channelId = args?.channelId;
    const cachedId = `${communityId}${channelId || ""}`;

    return {
      canRead: async () => {
        if (!communityId) return false;
        if (context.communities?.[cachedId]?.canRead !== undefined)
          return context.communities?.[cachedId]?.canRead;

        try {
          const canRead = await this.validPermissionForAccount(
            context.account || { _id: context.accountId },
            {
              communityId,
              channelId,
              permissionIdentifier: "READ",
            },
            context
          );
          context.communities = {
            ...context.communities,
            [cachedId]: {
              canRead,
            },
          };
          return canRead;
        } catch (e) {
          console.log(e);
          return false;
        }
      },
      canWrite: async () => {
        if (!communityId || !context.accountId) return false;
        if (context.communities?.[cachedId]?.canWrite !== undefined)
          return context.communities?.[cachedId]?.canWrite;

        try {
          const canWrite = await this.validPermissionForAccount(
            context.account || { _id: context.accountId },
            {
              communityId,
              channelId,
              permissionIdentifier: "WRITE",
            },
            context
          );
          context.communities = {
            ...context.communities,
            [cachedId]: {
              canWrite,
            },
          };
          return canWrite;
        } catch (e) {
          console.log(e);
          return false;
        }
      },
    };
  }
}

module.exports = { Service: CurrentAccountPermissionService };
