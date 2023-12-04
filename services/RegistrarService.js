const ethers = require("ethers");

const Sentry = require("@sentry/node");
const { Service: _AlchemyService } = require("./AlchemyService");
const { Service: _CacheService } = require("./cache/CacheService");
const {
  Service: _FarcasterService,
} = require("./identities/FarcasterServiceV2");
const {
  Service: _InitializeCommunityService,
} = require("./initializer/InitializeCommunityService");

const { getTokenIdFromLabel } = require("../helpers/get-token-id-from-label");
const { getProvider } = require("../helpers/alchemy-provider");
const { config, prod } = require("../helpers/registrar");
const {
  validateAndConvertAddress,
} = require("../helpers/validate-and-convert-address");
const {
  validateAndConvertDuration,
} = require("../helpers/validate-and-convert-duration");
const {
  generateSecretFromAddressAndDuration,
} = require("../helpers/generate-secret-from-address-and-duration");

const { Community } = require("../models/Community");

class RegistrarService {
  constructor(optimism = false) {
    if (!optimism) {
      const AlchemyService = new _AlchemyService({
        apiKey: prod().NODE_URL, // force use prod for ENS
        chain: prod().NODE_NETWORK, // force use prod for ENS
      });
      const alchemyProvider = getProvider({
        network: config().NODE_NETWORK,
        node: config().NODE_URL,
      });

      const controller = new ethers.Contract(
        config().BETA_CONTROLLER_ADDRESS,
        config().BETA_CONTROLLER_ABI,
        alchemyProvider
      );
      const registrar = new ethers.Contract(
        config().REGISTRAR_ADDRESS,
        config().REGISTRAR_ABI,
        alchemyProvider
      );

      this.AlchemyService = AlchemyService;
      this.alchemyProvider = alchemyProvider;
      this.controller = controller;
      this.registrar = registrar;
    } else {
      const AlchemyService = new _AlchemyService({
        apiKey: prod().OPTIMISM_NODE_URL, // force use prod for ENS
        chain: prod().OPTIMISM_NODE_NETWORK, // force use prod for ENS
      });
      const alchemyProvider = getProvider({
        network: prod().OPTIMISM_NODE_NETWORK,
        node: prod().OPTIMISM_NODE_URL,
      });

      const controller = new ethers.Contract(
        prod().OPTIMISM_CONTROLLER_ADDRESS,
        prod().OPTIMISM_CONTROLLER_ABI,
        alchemyProvider
      );
      const registrar = new ethers.Contract(
        prod().OPTIMISM_REGISTRAR_ADDRESS,
        prod().REGISTRAR_ABI,
        alchemyProvider
      );

      this.AlchemyService = AlchemyService;
      this.alchemyProvider = alchemyProvider;
      this.controller = controller;
      this.registrar = registrar;
    }
  }

  /**
   * Get owner of NFT tokenId
   * @returns {Promise<string>} - address of owner
   */
  async getOwner(domain, _tld = "beb") {
    if (!domain) return null;
    const tokenId = this.getTokenIdFromLabel(domain);
    try {
      const CacheService = new _CacheService();
      const cachedOwner = await CacheService.get({
        key: `RegistrarService.getOwner`,
        params: { domain },
      });
      if (cachedOwner) return cachedOwner;
      const owner = await this.registrar.ownerOf(tokenId);
      if (owner) {
        CacheService.set({
          key: `RegistrarService.getOwner`,
          params: { domain },
          value: owner,
          expiresAt: new Date(Date.now() + 1000 * 60 * 15), // 15 minute cache,
        });
      }
      return owner;
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      // tokenId is not registered
      return null;
    }
  }

  /**
   * Get if community is available
   * @returns {Promise<boolean>}
   */
  async available(bebdomain) {
    if (!bebdomain) return false;
    return await this.controller.available(bebdomain);
  }

  /**
   * Get community expires date
   * @returns {Promise<string>}
   */
  async expiresAt(domain) {
    if (!domain) return null;
    const tokenId = this.getTokenIdFromLabel(domain);
    try {
      const CacheService = new _CacheService();
      const cachedDuration = await CacheService.get({
        key: `RegistrarService.expiresAt`,
        params: { domain },
      });
      if (cachedDuration) return cachedDuration;
      const nameDuration = await this.registrar.nameExpires(tokenId);
      if (nameDuration) {
        CacheService.set({
          key: `RegistrarService.expiresAt`,
          params: { domain },
          value: nameDuration.toString(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 1), // 1 minute cache,
        });
      }
      return nameDuration?.toString();
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      // tokenId is not registered
      return null;
    }
  }

  /**
   * Get community price
   * @returns {Promise<RentPrice>}
   */
  async rentPrice({ bebdomain, duration }) {
    if (!bebdomain || !duration) return null;
    const [base, premium] = await this.controller.rentPrice(
      bebdomain,
      validateAndConvertDuration(duration)
    );
    return {
      base: ethers.BigNumber.from(base).toString(),
      premium: ethers.BigNumber.from(premium).toString(),
    };
  }

  makeSecret({ bebdomain, address, duration }) {
    return generateSecretFromAddressAndDuration({
      address: validateAndConvertAddress(address),
      duration: validateAndConvertDuration(duration),
      bebdomain: bebdomain,
    });
  }

  /**
   * Get community commitment
   * @returns {Promise<string>}
   */
  async makeCommitment({ bebdomain, address, duration }) {
    if (!bebdomain) return false;

    const commitmentHash = await this.controller.makeCommitment(
      bebdomain,
      validateAndConvertAddress(address),
      validateAndConvertDuration(duration),
      this.makeSecret({ bebdomain, address, duration })
    );
    return commitmentHash;
  }

  /**
   * Get if community is available
   * @returns {Promise<string>}
   */
  getTokenIdFromLabel(bebdomain) {
    return getTokenIdFromLabel(bebdomain);
  }
  /**
   * Create default community from bebdomain after registering a new community id
   * @returns {Promise<Community>}
   */
  async registerCommunity(_, { bebdomain, tld = "beb" }, context) {
    if (!bebdomain) throw new Error("Invalid domain name");

    const owner = await this.getOwner(bebdomain, tld);

    if (!owner) {
      throw new Error("Community is not registered in the registrar");
    }
    await context.account?.populate?.("addresses");
    if (
      context.account?.addresses?.[0]?.address?.toLowerCase?.() !==
      owner?.toLowerCase?.()
    ) {
      throw new Error("Only owner can register a community");
    }
    const existing = await Community.findOne({ bebdomain });
    if (existing) {
      throw new Error("A community already exists for this domain");
    }

    if (process.env.BLOCK_INITIALIZE) {
      throw new Error(
        "Initializing Communities is blocked due to BLOCK_INITIALIZE!"
      );
    }

    const InitializeCommunityService = new _InitializeCommunityService();
    const community = await Community.create({
      bebdomain,
      tokenId: this.getTokenIdFromLabel(bebdomain),
      name: bebdomain,
      owner: context.account._id,
      tld,
    });
    await InitializeCommunityService.createDefaultRoleWithPermissions(
      community
    );
    return community;
  }
}

module.exports = { Service: RegistrarService };
