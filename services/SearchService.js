const { Account } = require("../models/Account");
const { Community } = require("../models/Community");
const { Farcaster } = require("../models/Identities/Farcaster");
const filter = require("../helpers/filter");

const { isAddress, isENS } = require("../helpers/validate-and-convert-address");
const {
  getAddressFromEnsOrAddress,
} = require("../helpers/get-address-from-ens");

class SearchService {
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
    }
    return accounts;
  }

  /* find Community by search query */
  async searchCommunityByDomainOrName(query) {
    const communities = await Community.find({
      $or: [
        {
          bebdomain: { $regex: query, $options: "i" },
        },
        {
          name: { $regex: query, $options: "i" },
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
