const { Account } = require("../models/Account");
const { Community } = require("../models/Community");
const { Farcaster } = require("../models/Identities/Farcaster");
const { UserData, UserDataType } = require("../models/farcaster");
const { getFarcasterUserByFid } = require("../helpers/farcaster");
const filter = require("../helpers/filter");

const { isAddress, isENS } = require("../helpers/validate-and-convert-address");
const {
  getAddressFromEnsOrAddress,
} = require("../helpers/get-address-from-ens");

class SearchService {
  // Utility function to convert username search string to hex regex pattern
  _getUsernameHexPattern(searchString) {
    const hexSearchString = Buffer.from(searchString, "ascii").toString("hex");
    return new RegExp(`^0x.*${hexSearchString}.*`, "i");
  }

  async searchFarcasterUserByUsername(searchString) {
    // Convert the search string to its hex representation
    const hexSearchString = Buffer.from(searchString, "ascii").toString("hex");

    // Start by searching for an exact match
    let users = await UserData.find({
      value: `0x${hexSearchString}`,
      type: UserDataType.USER_DATA_TYPE_USERNAME,
      deletedAt: null,
    })
      .sort("-updatedAt")
      .limit(5);

    // If we didn't find 5 users or want to add more inexact matches
    if (users.length < 5) {
      // Create a regex pattern that searches for this hex string with the "0x" prefix
      const pattern = new RegExp(`^0x${hexSearchString}.*`, "i");

      // Find additional users with the pattern
      const regexUsers = await UserData.find({
        value: pattern,
        type: UserDataType.USER_DATA_TYPE_USERNAME,
        deletedAt: null,
      })
        .sort("-updatedAt")
        .limit(5 - users.length); // limit to the number of users needed to reach 5

      users = users.concat(regexUsers);
    }
    if (users && users.length > 0) {
      // an array of Account, derived from signer address
      let uniqueIds = {};
      for (let i = 0; i < users.length; i++) {
        try {
          const farcasterIdentity = await getFarcasterUserByFid(users[i].fid);
          const account = await Account.findOrCreateByAddressAndChainId({
            address: farcasterIdentity.custodyAddress,
            chainId: 1,
          });
          if (uniqueIds[account._id]) continue;
          uniqueIds[account._id] = {
            ...account.toObject(),
            identities: {
              farcaster: {
                ...farcasterIdentity,
              },
            },
          };
        } catch (e) {
          console.log(e);
          continue;
        }
      }
      return Object.values(uniqueIds);
    }

    return [];
  }

  /**
   * Find all accounts by username or identity username such as Farcaster
   * @TODO add limit
   */

  async searchAccountByIdentity(query) {
    const farcasterWithAccounts = await Farcaster.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        {
          displayName: { $regex: query, $options: "i" },
        },
      ],
    })
      .populate("account")
      .sort("-updatedAt")
      .limit(5);
    return farcasterWithAccounts?.map((farcaster) => farcaster.account);
  }
  /* find Account by search query */
  // add limit
  async searchAccountByUsernameOrAddressOrENS(query) {
    let accounts = [];

    if (isAddress(query) || isENS(query)) {
      const address = await getAddressFromEnsOrAddress(query);
      if (!address) return [];

      const account = await Account.findByAddressAndChainId({
        address,
        chainId: 1, // @TODO chainId
      });
      if (!account) return [];
      if (account.deleted) return [];
      accounts.push(account);
    } else {
      accounts = await Account.find({
        username: { $regex: query, $options: "i" },
      })
        .sort("-updatedAt")
        .limit(5);
      accounts = accounts.filter((account) => !account.deleted);
      const farcasterAccounts = await this.searchFarcasterUserByUsername(query);
      if (farcasterAccounts) {
        // filter by unique accounts
        // const ids = {};
        // const combined = [...accounts, ...farcasterAccounts];
        // combined.forEach((a) => {
        //   ids[a._id] = a;
        // });
        accounts = [...accounts, ...farcasterAccounts];
      }
    }
    return accounts;
  }

  /* find Community by search query */
  async searchCommunityByDomainOrName(query) {
    const communities = await Community.find({
      $or: [
        {
          bebdomain: { $regex: query.trim(), $options: "i" },
        },
        {
          name: { $regex: query.trim(), $options: "i" },
        },
      ],
    })
      .sort("-updatedAt")
      .limit(20);

    const filteredCommunities = communities.filter((community) => {
      if (process.env.MODE !== "self-hosted") {
        if (filter.isProfane(community.name)) return false;
        if (filter.isProfane(community.bebdomain)) return false;
      }
      return true;
    });
    return filteredCommunities;
  }
}

module.exports = { Service: SearchService };
