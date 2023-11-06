const ethers = require("ethers");
const axios = require("axios");
const Sentry = require("@sentry/node");
const { getProvider } = require("../helpers/alchemy-provider");
const { config } = require("../helpers/marketplace");
const {
  validateAndConvertAddress,
} = require("../helpers/validate-and-convert-address");
const { getMemcachedClient } = require("../connectmemcached");
const { Listings, ListingLogs, Fids } = require("../models/farcaster");
const {
  getFarcasterUserByFid,
  searchFarcasterUserByMatch,
} = require("../helpers/farcaster");

class MarketplaceService {
  constructor() {
    const alchemyProvider = getProvider({
      network: config().NODE_NETWORK,
      node: config().NODE_URL,
    });

    const marketplace = new ethers.Contract(
      config().FID_MARKETPLACE_V1_ADDRESS,
      config().FID_MARKETPLACE_V1_ABI,
      alchemyProvider
    );

    const idRegistry = new ethers.Contract(
      config().ID_REGISTRY_ADDRESS,
      config().ID_REGISTRY_ABI,
      alchemyProvider
    );

    this.marketplace = marketplace;
    this.idRegistry = idRegistry;
    this.alchemyProvider = alchemyProvider;
  }

  async _ethToUsd(eth) {
    try {
      const memcached = getMemcachedClient();
      try {
        const cachedEth = await memcached.get({
          key: `MarketplaceService_ethToUsd`,
        });
        if (cachedEth) {
          return ethers.BigNumber.from(cachedEth).mul(eth).toString();
        }
      } catch (e) {
        console.error(e);
      }
      const url = `
    https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${process.env.ETHERSCAN_API_KEY}`;

      const response = await axios.get(url);
      const data = response.data;
      const ethPrice = data.result?.ethusd;
      if (!ethPrice) {
        return "0";
      }
      try {
        await memcached.set(
          `MarketplaceService_ethToUsd`,
          parseInt(ethPrice).toString(),
          {
            lifetime: 60, // 60s
          }
        );
      } catch (e) {
        console.error(e);
      }

      return ethers.BigNumber.from(parseInt(ethPrice)).mul(eth).toString();
    } catch (e) {
      console.error(e);
      Sentry.captureException(e);
      return "0";
    }
  }

  // pad number with zeros to 32 bytes for easy sorting in mongodb
  _padWithZeros(numberString) {
    const maxLength = 32;
    while (numberString.length < maxLength) {
      numberString = "0" + numberString;
    }
    return numberString;
  }

  async getListing({ fid }) {
    const memcached = getMemcachedClient();
    let cached;
    try {
      cached = await memcached.get({
        key: `Listing:${fid}`,
      });
    } catch (e) {
      console.error(e);
    }
    let listing;
    if (cached) {
      listing = JSON.parse(cached.value);
    } else {
      const query = {
        fid,
        canceledAt: null,
        boughtAt: null,
        deadline: { $gt: Math.floor(Date.now() / 1000) },
      };
      listing = await Listings.findOne(query);
      listing = listing ? listing._doc : null;
    }
    if (!listing) return null;

    const user = await this.fetchUserData(fid);
    const usdWei = await this._ethToUsd(listing.minFee);
    const usd = ethers.utils.formatEther(usdWei);

    return {
      ...listing,
      usd,
      user,
    };
  }

  async fetchUserData(fid) {
    return await getFarcasterUserByFid(fid);
  }

  async fetchListing(fid) {
    return await this.getListing({ fid });
  }

  async fetchDataForFids(fidsArr) {
    return await Promise.all(
      fidsArr.map(async (fid) => {
        const user = await this.fetchUserData(fid);
        const listing = await this.fetchListing(fid);
        return {
          fid,
          user,
          listing,
        };
      })
    );
  }

  async filterByUserProfile(data) {
    return data.filter((item) => item.user);
  }

  // @TODO add filters
  async getOnlyBuyNowListings({
    sort = "-minFee",
    limit = 20,
    cursor = "",
    filters = {},
  }) {
    const [offset, lastId] = cursor ? cursor.split("-") : [null, null];

    const query = {
      timestamp: { $lt: offset || Date.now() },
      id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
      canceledAt: null,
      boughtAt: null,
      deadline: { $gt: Math.floor(Date.now() / 1000) },
    };

    const listings = await Listings.find(query).limit(limit).sort(sort);
    let extraData = await Promise.all(
      listings.map(async (listing) => {
        const user = await this.fetchUserData(listing.fid);
        return {
          fid: listing.fid,
          user,
          listing,
        };
      })
    );

    let next = null;
    if (listings.length === limit) {
      next = `${listings[listings.length - 1].timestamp.getTime()}-${
        listings[listings.length - 1].id
      }`;
    }

    return [extraData.slice(0, limit), next];
  }
  async latestFid() {
    return await Fids.countDocuments();
  }

  async searchListings({
    sort = "fid",
    limit = 20,
    cursor = "",
    filters = {},
  }) {
    // @TODO add sort and cursor
    const users = await searchFarcasterUserByMatch(
      filters.query,
      limit,
      "value"
    );

    const extraData = await Promise.all(
      users.map(async (user) => {
        const listing = await this.fetchListing(user.fid);
        return {
          fid: user.fid,
          user,
          listing,
        };
      })
    );
    return [extraData, null];
  }

  async getListingsDsc({
    sort = "fid",
    limit = 20,
    cursor = "",
    filters = {},
  }) {
    const [offset, lastId] = cursor
      ? cursor.split("-")
      : [await this.latestFid(), null];
    let startsAt = parseInt(offset);
    let endAt = startsAt - parseInt(limit);

    let fidsArr = [];
    for (let i = startsAt; i > endAt; i--) {
      fidsArr.push(i.toString());
    }

    let extraData = await this.fetchDataForFids(fidsArr);

    let next = null;
    if (extraData.length >= limit) {
      const lastFid = ethers.BigNumber.from(
        extraData[extraData.length - 1].fid
      );
      next = `${lastFid.sub(1).toString()}-${lastFid.sub(1).toString()}`;
    }

    return [extraData.slice(0, limit), next];
  }

  async getListings({ sort = "fid", limit = 20, cursor = "", filters = {} }) {
    if (filters.query) {
      // filter by searching users
      return await this.searchListings({
        sort,
        limit,
        cursor,
        filters,
      });
    } else if (sort === "minFee" || sort === "-minFee" || filters.onlyListing) {
      return await this.getOnlyBuyNowListings({
        sort,
        limit,
        cursor,
        filters,
      });
    } else if (sort === "-fid") {
      return await this.getListingsDsc({
        sort,
        limit,
        cursor,
        filters,
      });
    }
    const [offset, lastId] = cursor ? cursor.split("-") : ["1", null];
    let startsAt = parseInt(offset);
    let endAt = startsAt + parseInt(limit);

    let fidsArr = [];
    for (let i = startsAt; i < endAt; i++) {
      fidsArr.push(i.toString());
    }

    let extraData = await this.fetchDataForFids(fidsArr);

    let next = null;
    if (extraData.length >= limit) {
      const lastFid = ethers.BigNumber.from(
        extraData[extraData.length - 1].fid
      );
      next = `${lastFid.add(1).toString()}-${lastFid.add(1).toString()}`;
    }

    return [extraData.slice(0, limit), next];
  }

  /**
   * Get proxy marketplace address
   * @returns {Promise<string>} - address of owner
   */
  async getProxyAddress({ address, salt }) {
    if (!address || !salt) return null;

    try {
      const memcached = getMemcachedClient();
      let proxyAddress;
      try {
        const cached = await memcached.get({
          key: `MarketplaceService:getProxyAddress:${address}:${salt}`,
        });
        if (cached) {
          proxyAddress = JSON.parse(cached.value);
        }
      } catch (e) {
        console.error(e);
      }
      if (proxyAddress) return proxyAddress;
      proxyAddress = await this.marketplace.getAddress(
        validateAndConvertAddress(address),
        salt
      );
      await memcached.set(
        `MarketplaceService:getProxyAddress:${address}:${salt}`,
        JSON.stringify(proxyAddress)
      );
      return proxyAddress;
    } catch (e) {
      Sentry.captureException(e);
      return null;
    }
  }

  async getReceipt({ txHash }) {
    let tries = 0;
    let receipt;

    while (tries < 120) {
      tries += 1;
      await new Promise((r) => setTimeout(r, 1000));

      receipt = await this.alchemyProvider.getTransactionReceipt(
        txHash.toString()
      );
      if (receipt) break;
    }
    if (tries >= 60) throw new Error("Timeout");
    return receipt;
  }

  async cancelListing({ txHash }) {
    if (!txHash) {
      throw new Error("Missing txHash");
    }
    const receipt = await this.getReceipt({ txHash });
    if (!receipt) {
      throw new Error("Transaction not found");
    }
    const eventInterface = new ethers.utils.Interface(
      config().FID_MARKETPLACE_V1_ABI
    );
    let updatedListing = null;
    for (let log of receipt.logs) {
      try {
        const parsed = eventInterface.parseLog(log);
        const fid = parsed.args.fid.toNumber();

        const query = {
          fid,
          boughtAt: null,
          canceledAt: null,
        };

        if (parsed.name === "Canceled") {
          updatedListing = await Listings.updateOne(
            query,
            {
              canceledAt: new Date(),
            },
            {
              returnDocument: "after",
            }
          );

          await ListingLogs.updateOne(
            {
              txHash,
            },
            {
              eventType: "Canceled",
              fid: parsed.args.fid,
            },
            {
              upsert: true,
            }
          );

          const memcached = getMemcachedClient();
          try {
            await memcached.delete(`Listing:${fid}`);
          } catch (e) {
            console.error(e);
          }
          break;
        }
      } catch (error) {
        // Log could not be parsed; continue to next log
        throw new Error("Cannot cancel listing, try again later");
      }
    }
    if (!updatedListing) {
      throw new Error("FID not listed");
    }
    return updatedListing;
  }

  async list({ txHash }) {
    if (!txHash) throw new Error("Missing txHash");

    const receipt = await this.getReceipt({ txHash });
    if (!receipt) {
      throw new Error("Transaction not found");
    }

    const eventInterface = new ethers.utils.Interface(
      config().FID_MARKETPLACE_V1_ABI
    );

    let updatedListing = null;
    for (let log of receipt.logs) {
      try {
        const parsed = eventInterface.parseLog(log);
        const fid = parsed.args.fid.toNumber();

        const query = {
          fid,
          boughtAt: null,
          canceledAt: null,
        };

        if (parsed.name === "Listed") {
          updatedListing = await Listings.updateOne(
            query,
            {
              fid,
              ownerAddress: parsed.args.owner,
              minFee: this._padWithZeros(parsed.args.amount.toString()),
              deadline: parsed.args.deadline,
            },
            { upsert: true, returnDocument: "after" }
          );

          await ListingLogs.updateOne(
            {
              txHash,
            },
            {
              eventType: "Listed",
              fid: parsed.args.fid,
              from: parsed.args.owner,
              price: this._padWithZeros(parsed.args.amount.toString()),
            },
            {
              upsert: true,
            }
          );

          const memcached = getMemcachedClient();
          try {
            await memcached.set(
              `Listing:${fid}`,
              JSON.stringify(updatedListing)
            );
          } catch (e) {
            console.error(e);
          }

          break;
        }
      } catch (error) {
        // Log could not be parsed; continue to next log
      }
    }
    if (!updatedListing) {
      throw new Error("FID not listed");
    }
    return updatedListing;
  }

  async buy({ txHash }) {
    if (!txHash) throw new Error("Missing txHash");
    const receipt = await this.getReceipt({ txHash });
    if (!receipt) {
      throw new Error("Transaction not found");
    }

    const eventInterface = new ethers.utils.Interface(
      config().FID_MARKETPLACE_V1_ABI
    );

    let updatedListing = null;
    for (let log of receipt.logs) {
      try {
        const parsed = eventInterface.parseLog(log);

        if (parsed.name === "Bought") {
          const fid = parsed.args.fid.toNumber();

          const query = {
            fid,
            boughtAt: null,
            canceledAt: null,
          };

          updatedListing = await Listings.updateOne(
            query,
            {
              canceledAt: new Date(),
              boughtAt: new Date(),
              buyerAddress: parsed.args.buyer,
            },
            { returnDocument: "after" }
          );

          await ListingLogs.updateOne(
            {
              txHash,
            },
            {
              eventType: "Bought",
              fid: parsed.args.fid,
              from: parsed.args.buyer,
              price: this._padWithZeros(parsed.args.amount.toString()),
            },
            {
              upsert: true,
            }
          );
          const memcached = getMemcachedClient();
          try {
            await memcached.set(
              `Listing:${parsed.args.fid}`,
              JSON.stringify(updatedListing)
            );
          } catch (e) {
            console.error(e);
          }
          break;
        }
      } catch (error) {
        // Log could not be parsed; continue to next log
      }
    }
    if (!updatedListing) {
      throw new Error("FID not bought");
    }
    return updatedListing;
  }
}

module.exports = { Service: MarketplaceService };
