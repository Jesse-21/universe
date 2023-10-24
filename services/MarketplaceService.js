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

    this.marketplace = marketplace;
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
  async createListing({ fid, ownerAddress }) {
    const generateSalt = () => Math.floor(Math.random() * 1000000);
    try {
      const salt = generateSalt();
      if (!fid || !ownerAddress) {
        throw new Error("Missing fid or ownerAddress or minfee or deadline");
      }
      const memcached = getMemcachedClient();
      const existing = await memcached.get(`partialListing:${fid}`);
      if (existing) {
        return JSON.parse(existing.value);
      }
      const proxyVaultAddress = await this.getProxyAddress({
        address: ownerAddress,
        salt,
      });
      const partialListing = {
        ownerAddress,
        salt,
        fid,
        proxyVaultAddress,
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
  async completeListing({ ownerSignature, minFee, deadline, fid }) {
    try {
      if (!fid) {
        throw new Error("Missing fid or ownerAddress or minfee or deadline");
      }
      const memcached = getMemcachedClient();
      const partialData = await memcached.get(`partialListing:${fid}`);
      if (!partialData) {
        throw new Error("No partial listing found");
      }
      await memcached.delete(`partialListing:${fid}`);
      const parsedValue = JSON.parse(partialData.value);

      // verify signature is valid
      const isValidSignature = await this.marketplace.verifyListSig(
        fid,
        parsedValue.ownerAddress,
        parsedValue.proxyVaultAddress,
        deadline,
        ownerSignature
      );

      if (!isValidSignature) {
        throw new Error("Invalid signature");
      }

      // if listing already exists, update it
      const newListing = await Listings.updateOne(
        { fid },
        {
          ...parsedValue,
          ownerSignature: ownerSignature,
          minFee: minFee,
          deadline: deadline,
        },
        { upsert: true }
      );

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
}

module.exports = { Service: MarketplaceService };
