const axios = require("axios").default;
const Sentry = require("@sentry/node");
const pRetry = require("p-retry");
const TIMEOUT_MS = 30_000;

class OpenseaService {
  constructor({ apiKey, baseUrl }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  getHeaders() {
    return {
      "X-API-KEY": this.apiKey,
    };
  }

  async getCollectionByContract(contract) {
    const opts = {
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS,
    };

    try {
      const { data } = await axios.get(
        `${this.baseUrl}/asset_contract/${contract}`,
        opts
      );
      return data;
    } catch (e) {
      Sentry.captureException(e);
      throw new Error("Opensea API error: unable to fetch NFTs");
    }
  }

  async getCollectionBySlug(slug) {
    const opts = {
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS,
    };

    try {
      const { data } = await axios.get(
        `${this.baseUrl}/collection/${slug}`,
        opts
      );
      return data;
    } catch (e) {
      Sentry.captureException(e);
      throw new Error("Opensea API error: unable to fetch NFTs");
    }
  }

  async getCollectionByAssetOwner({ address, offset, limit = 20 } = {}) {
    const opts = {
      params: {
        asset_owner: address,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS,
    };

    try {
      const { data } = await axios.get(`${this.baseUrl}/collections`, opts);
      return data;
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      throw new Error("Opensea API error: unable to fetch NFTs");
    }
  }

  /** Retrieve a single asset */
  /** @docs https://docs.opensea.io/reference/retrieving-a-single-asset */
  async getAsset({
    asset_contract_address = null,
    token_id = "",
    account_address,
    include_orders = false,
  } = {}) {
    if (!asset_contract_address || !token_id)
      throw new Error("Required params not provided");

    let params = {};
    if (account_address) params.account_address = account_address;
    if (include_orders) params.include_orders = include_orders;
    const opts = {
      params,
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS,
    };

    try {
      const { data } = await axios.get(
        `${this.baseUrl}/asset/${asset_contract_address}/${token_id}`,
        opts
      );
      return data;
    } catch (e) {
      Sentry.captureException(e);
      throw new Error(`Opensea API error getAsset: ${e.message}`);
    }
  }

  async getAssetsByOwner({
    owner,
    cursor,
    limit = 20,
    asset_contract_addresses = [],
    asset_contract_address = null,
    token_ids = "",
  } = {}) {
    const params = new URLSearchParams();
    if (owner) params.append("owner", owner);
    if (cursor) params.append("cursor", cursor);
    if (limit) params.append("limit", limit);
    if (asset_contract_addresses && asset_contract_addresses.length) {
      asset_contract_addresses.forEach((address) => {
        params.append("asset_contract_addresses", address);
      });
    }
    if (asset_contract_address)
      params.append("asset_contract_address", asset_contract_address);
    if (token_ids) params.append("token_ids", token_ids);

    const opts = {
      params,
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS,
    };

    try {
      const { data } = await axios.get(`${this.baseUrl}/assets`, opts);
      return data;
    } catch (e) {
      Sentry.captureException(e);
      throw new Error("Opensea API error: unable to fetch NFTs");
    }
  }

  /**
   * Get all Opensea Assets for a given filter, with timeout and retry
   * @returns {Promise<OpenseaAsset[]>}
   */
  async getAllAssets({
    asset_contract_addresses = [],
    asset_contract_address = null,
    token_ids = "",
    owner,
    maxCount = 100000, // max asset amount to return
  }) {
    const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let curr = 0;
    const limit = 50;
    let cursor = null;
    let assets = [];

    /** get initial assets */
    const initialData = await pRetry(
      () =>
        this.getAssetsByOwner({
          asset_contract_addresses,
          asset_contract_address,
          token_ids,
          owner,
          limit,
        }),
      { retries: 10 }
    );

    cursor = initialData?.next;
    assets = [...assets, ...(initialData?.assets || [])];

    while (cursor && curr < maxCount) {
      const data = await pRetry(
        () =>
          this.getAssetsByOwner({
            asset_contract_addresses,
            asset_contract_address,
            token_ids,
            owner,
            cursor,
            limit,
          }),
        { retries: 10 }
      );
      await timeout(300);
      cursor = data?.next;
      assets = [...assets, ...(data?.assets || [])];
      curr += limit;
    }
    return assets;
  }

  async getAssetsByCollection({ collection, cursor, limit = 20 } = {}) {
    const opts = {
      params: {
        collection,
        limit: parseInt(limit),
        cursor,
      },
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS,
    };

    try {
      const { data } = await axios.get(`${this.baseUrl}/assets`, opts);
      return data;
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      throw new Error("Opensea API error: unable to fetch NFTs");
    }
  }

  async verifyOwnership({ address, contractAddress } = {}) {
    if (!address || !contractAddress) return false;
    const opts = {
      params: {
        owner: address,
        asset_contract_address: contractAddress,
      },
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS,
    };
    try {
      const { data } = await axios.get(`${this.baseUrl}/assets`, opts);
      const found = data?.assets?.[0];
      return !!found;
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      return false;
    }
  }
}

module.exports = { Service: OpenseaService };
