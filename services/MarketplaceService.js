const ethers = require("ethers");

const Sentry = require("@sentry/node");
const { getProvider } = require("../helpers/alchemy-provider");
const { config } = require("../helpers/marketplace");
const {
  validateAndConvertAddress,
} = require("../helpers/validate-and-convert-address");
const { getMemcachedClient } = require("../connectmemcached");
const { Listings } = require("../models/farcaster");

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

  async getListings({ sort = "-fid", limit = 20, offset = 0, filters = {} }) {
    // let matchQuery = this._buildPostFeedMatchQuery({ filters });

    const listings = await Listings.aggregate([
      // { $match: matchQuery },
      // sort by last created replies
      { $sort: sort },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);
    return listings;
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
  async completeListing({ fid, ownerAddress, salt }) {
    try {
      if (!fid || !ownerAddress) {
        throw new Error("Missing fid or ownerAddress");
      }

      const proxyVaultAddress = await this.getProxyAddress({
        address: ownerAddress,
        salt: salt,
      });

      const proxyContract = new ethers.Contract(
        proxyVaultAddress,
        config().FID_MARKETPLACE_PROXY_V1_ABI,
        this.alchemyProvider
      );

      // verify proxyContract is valid and listed
      const [_fid, isListed, ownerSignature, minFee, deadline, owner] =
        await Promise.all([
          proxyContract.fid(),
          proxyContract.isListed(),
          proxyContract.ownerSignature(),
          proxyContract.minFee(),
          proxyContract.deadline(),
          proxyContract.owner(),
        ]);

      if (
        _fid.toString() !== fid.toString() ||
        owner.toLowerCase() !== ownerAddress.toLowerCase()
      ) {
        throw new Error("Invalid fid for owner address");
      }
      if (!isListed) {
        throw new Error("Fid is not listed");
      }

      // if listing already exists, update it
      const newListing = await Listings.updateOne(
        { fid },
        {
          salt,
          fid,
          ownerAddress,
          ownerSignature: ownerSignature,
          minFee: minFee,
          deadline: deadline,
          proxyVaultAddress,
        },
        { upsert: true }
      );

      const memcached = getMemcachedClient();
      await memcached.set(`Listing:${fid}`, JSON.stringify(newListing), {
        lifetime:
          // deadline - now
          (deadline - Math.floor(Date.now() / 1000)) * 100,
      });
      return newListing;
    } catch (e) {
      throw new Error(e);
    }
  }

  async cancelListing({ listingId }) {
    const listing = await Listings.findOne({ fid: listingId });
    if (!listing) {
      throw new Error("Listing not found");
    }
    const proxyContract = new ethers.Contract(
      listing.proxyVaultAddress,
      config().FID_MARKETPLACE_PROXY_V1_ABI,
      this.alchemyProvider
    );
    const isListed = await proxyContract.isListed();
    if (isListed) {
      throw new Error("Listing not cancelled");
    }

    listing.canceledAt = new Date();
    const updatedListing = await listing.save();
    return updatedListing;
  }
}

module.exports = { Service: MarketplaceService };
