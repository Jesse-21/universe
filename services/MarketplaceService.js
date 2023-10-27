const ethers = require("ethers");

const Sentry = require("@sentry/node");
const { getProvider } = require("../helpers/alchemy-provider");
const { config } = require("../helpers/marketplace");
const {
  validateAndConvertAddress,
} = require("../helpers/validate-and-convert-address");
const { getMemcachedClient } = require("../connectmemcached");
const { Listings, ListingLogs, Fids } = require("../models/farcaster");
const { getFarcasterUserByFid } = require("../helpers/farcaster");

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

  async getListing({ fid }) {
    const memcached = getMemcachedClient();
    const cached = await memcached.get({
      key: `Listing:${fid}`,
    });
    if (cached) {
      return JSON.parse(cached.value);
    }
    const query = {
      fid,
      canceledAt: null,
    };
    const listing = await Listings.findOne(query);

    return listing;
  }

  async getListings({ sort = "-fid", limit = 20, cursor = "", filters = {} }) {
    // let matchQuery = this._buildPostFeedMatchQuery({ filters });
    const [offset, lastId] = cursor ? cursor.split("-") : ["0", null];
    const startsAt = parseInt(offset);
    const fidsArr = [];
    for (let i = startsAt; i < startsAt + limit; i++) {
      fidsArr.push(i.toString());
    }

    const extraData = await Promise.all(
      fidsArr.map(async (fid) => {
        const user = await getFarcasterUserByFid(fid);
        const listing = await this.getListing({ fid: fid });
        return {
          user,
          listing,
        };
      })
    );
    const fids = fidsArr.map((fid, index) => {
      return {
        fid,
        ...extraData[index],
      };
    });

    let next = null;
    if (fids.length === limit) {
      next = `${fids[fids.length - 1].fid}-${fids[fids.length - 1].id}`;
    }

    return [fids, next];
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
      const cached = await memcached.get({
        key: `MarketplaceService:getProxyAddress:${address}:${salt}`,
      });
      if (cached) {
        proxyAddress = JSON.parse(cached.value);
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

  /**
   * Get partial marketplace listing
   * @returns {Promise<string>} - address of owner
   */
  async createListing({ fid }) {
    const generateSalt = () => Math.floor(Math.random() * 1000000);
    try {
      const salt = generateSalt();
      if (!fid) {
        throw new Error("Missing fid");
      }
      const memcached = getMemcachedClient();
      const existing = await memcached.get(`partialListing:${fid}`);
      if (existing) {
        return JSON.parse(existing.value);
      }
      const partialListing = {
        salt,
        fid,
      };

      await memcached.set(
        `partialListing:${fid}`,
        JSON.stringify(partialListing),
        { lifetime: 60 * 60 } // 1 hour
      );
      return partialListing;
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * Complete marketplace listing
   * @returns {Promise<string>} - address of owner
   */
  async completeListing({ fid }) {
    try {
      if (!fid) {
        throw new Error("Missing fid");
      }

      // verify proxyContract is valid and listed
      const listing = await this.marketplace.listings(fid);

      if (!listing) {
        throw new Error("Fid is not listed");
      }

      // if listing already exists, update it
      await Listings.updateOne(
        { fid },
        {
          fid,
          ownerAddress: listing.owner,
          ownerSignature: listing.ownerSignature,
          minFee: listing.minFee,
          deadline: listing.deadline,
        },
        { upsert: true }
      );
      await ListingLogs.create({
        eventType: "Listed",
        fid,
        from: listing.owner,
        price: listing.minFee,
      });
      const updatedListing = await Listings.findOne({ fid });

      const memcached = getMemcachedClient();
      await memcached.set(`Listing:${fid}`, JSON.stringify(updatedListing), {
        lifetime:
          // deadline - now
          (listing.deadline - Math.floor(Date.now() / 1000)) * 100,
      });
      return updatedListing;
    } catch (e) {
      throw new Error(e);
    }
  }

  async cancelListing({ fid }) {
    const listing = await Listings.findOne({ fid: fid });
    if (!listing) {
      throw new Error("Listing not found");
    }
    const onchainListing = await this.marketplace.listings(fid);

    if (onchainListing) {
      throw new Error("Listing not cancelled");
    }
    listing.fid = `Canceled-${listing.fid}`;
    listing.canceledAt = new Date();
    const updatedListing = await listing.save();
    await ListingLogs.create({
      eventType: "Canceled",
      fid,
      from: listing.owner,
      price: listing.minFee,
    });
    const memcached = getMemcachedClient();
    await memcached.delete(`Listing:${fid}`);
    return updatedListing;
  }

  async list({ txHash }) {
    const receipt = await this.alchemyProvider.getTransactionReceipt(txHash);
    const eventInterface = new ethers.utils.Interface(
      config().FID_MARKETPLACE_V1_ABI
    );

    let updatedListing = null;
    for (let log of receipt.logs) {
      try {
        const parsed = eventInterface.parseLog(log);
        const fid = parsed.args.fid.toString();

        if (parsed.name === "Listed") {
          await Listings.updateOne(
            { fid },
            {
              fid,
              ownerAddress: parsed.args.owner,
              minFee: parsed.args.amount,
              deadline: parsed.args.deadline,
            },
            { upsert: true }
          );

          const updatedListing = await Listings.findOne({ fid });
          await ListingLogs.updateOne(
            {
              txHash,
            },
            {
              eventType: "Listed",
              fid: parsed.args.fid.toString(),
              from: parsed.args.owner,
              price: parsed.args.amount,
            },
            {
              upsert: true,
            }
          );
          const memcached = getMemcachedClient();
          await memcached.set(`Listing:${fid}`, JSON.stringify(updatedListing));
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
    const receipt = await this.alchemyProvider.getTransactionReceipt(txHash);
    const eventInterface = new ethers.utils.Interface(
      config().FID_MARKETPLACE_V1_ABI
    );

    let updatedListing = null;
    for (let log of receipt.logs) {
      try {
        const parsed = eventInterface.parseLog(log);

        if (parsed.name === "Bought") {
          const listing = await Listings.findOne({
            fid: parsed.args.fid.toString(),
          });
          if (!listing) {
            throw new Error("Listing not found");
          }
          listing.fid = `Bought-${listing.fid}`;
          listing.canceledAt = new Date();
          listing.boughtAt = new Date();
          listing.buyerAddress = parsed.args.buyer;

          updatedListing = await listing.save();
          await ListingLogs.updateOne(
            {
              txHash,
            },
            {
              eventType: "Bought",
              fid: parsed.args.fid.toString(),
              from: parsed.args.buyer,
              price: parsed.args.amount,
            },
            {
              upsert: true,
            }
          );
          const memcached = getMemcachedClient();
          await memcached.delete(`Listing:${parsed.args.fid.toString()}`);
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
