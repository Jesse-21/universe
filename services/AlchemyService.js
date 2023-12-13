const axios = require("axios").default;
const Sentry = require("@sentry/node");
const TIMEOUT_MS = 15_000;

class AlchemyService {
  constructor({ apiKey, chain = "eth-mainnet" }) {
    this.apiKey = apiKey;
    this.chain = chain;
    if (this.chain == "homestead" || this.chain == "mainnet") {
      this.chain = "eth-mainnet";
    }
    if (
      this.chain === "rinkeby" ||
      this.chain === "ropsten" ||
      this.chain === "goerli"
    ) {
      this.chain = `eth-${this.chain}`;
    }
  }

  getBaseRoute() {
    return `https://${this.chain}.g.alchemy.com/v2/${this.apiKey}`;
  }
  getNFTBaseRoute() {
    return `https://${this.chain}.g.alchemy.com/nft/v2/${this.apiKey}`;
  }

  /**
   * @docs https://docs.alchemy.com/alchemy/enhanced-apis/nft-api/getnftmetadata
   * @returns Promise<{NFTMetadata}>
   */
  async getNFTMetadata({ contractAddress, tokenId, tokenType }) {
    const opts = {
      timeout: TIMEOUT_MS,
    };
    const route = `${this.getNFTBaseRoute()}/getNFTMetadata`;
    const params = {
      contractAddress,
      tokenId,
    };
    if (tokenType) params.tokenType = tokenType;

    try {
      const { data } = await axios.get(route, { params, ...opts });
      return data;
    } catch (e) {
      Sentry.captureException(e);
      throw new Error(`AlchemyService.getNFTMetadata error, ${e.message}`);
    }
  }

  /**
   * @docs https://docs.alchemy.com/alchemy/enhanced-apis/nft-api/getnftmetadata
   * @returns Promise<{NFTMetadata}>
   */
  async getNFTs({ owner, pageKey, contractAddresses, withMetadata, filters }) {
    const opts = {
      timeout: TIMEOUT_MS,
    };
    const route = `${this.getNFTBaseRoute()}/getNFTs`;
    const params = new URLSearchParams();
    if (owner) params.append("owner", owner);
    if (pageKey) params.append("pageKey", pageKey);
    if (withMetadata) params.append("withMetadata", withMetadata);
    if (contractAddresses && contractAddresses.length) {
      contractAddresses.forEach((address) => {
        params.append("contractAddresses[]", address);
      });
    }
    if (filters && filters.length) {
      filters.forEach((filter) => {
        params.append("filters", filter);
      });
    }

    try {
      const { data } = await axios.get(route, { params, ...opts });
      return data;
    } catch (e) {
      Sentry.captureException(e);
      throw new Error(`AlchemyService.getNFTMetadata error, ${e.message}`);
    }
  }
  /**
   * @docs https://docs.alchemy.com/reference/isholderofcollection
   * @returns Promise<Boolean>
   */
  async isHolderOfCollection({ wallet, contractAddress }) {
    const opts = {
      timeout: TIMEOUT_MS,
    };
    const route = `${this.getNFTBaseRoute()}/isHolderOfCollection`;
    const params = new URLSearchParams();
    if (wallet) params.append("wallet", wallet);
    if (contractAddress) params.append("contractAddress", contractAddress);
    try {
      const { data } = await axios.get(route, { params, ...opts });
      return !!data?.isHolderOfCollection;
    } catch (e) {
      console.log(e);
      Sentry.captureException(e);
      return false;
    }
  }
  /**
   * @docs https://docs.alchemy.com/alchemy/enhanced-apis/nft-api/getOwnersForToken
   * @returns Promise<{owners: String[]}>
   */
  async getOwnersForToken({ contractAddress, tokenId }) {
    const opts = {
      timeout: TIMEOUT_MS,
    };
    const route = `${this.getNFTBaseRoute()}/getOwnersForToken`;
    const params = {
      contractAddress,
      tokenId,
    };

    try {
      const { data } = await axios.get(route, { params, ...opts });
      return data;
    } catch (e) {
      Sentry.captureException(e);
      throw new Error(`AlchemyService.getOwnersForToken error, ${e.message}`);
    }
  }

  /**
   * @docs https://docs.alchemy.com/alchemy/enhanced-apis/nft-api/getownersforcollection
   * @returns Promise<{owners: String[]}>
   */
  async getOwnersForCollection({ contractAddress, withTokenBalances }) {
    const opts = {
      timeout: TIMEOUT_MS,
    };
    const route =
      `${this.getNFTBaseRoute()}/getOwnersForCollection` +
      (withTokenBalances ? "?withTokenBalances=true" : "");
    const params = {
      contractAddress,
    };

    try {
      const { data } = await axios.get(route, { params, ...opts });
      return data;
    } catch (e) {
      Sentry.captureException(e);
      throw new Error(
        `AlchemyService.getOwnersForCollection error, ${e.message}`
      );
    }
  }

  /**
   * @docs https://docs.alchemy.com/alchemy/enhanced-apis/nft-api/getfloorprice
   * @returns Promise<{openSea: Object, looksRare: Object}>
   */
  async getCollectionFloor({ contractAddress }) {
    const opts = {
      timeout: TIMEOUT_MS,
    };
    const route = `${this.getNFTBaseRoute()}/getFloorPrice`;
    const params = {
      contractAddress,
    };

    try {
      const { data } = await axios.get(route, { params, ...opts });
      if (data.error) {
        Sentry.captureException(
          `AlchemyService.getCollectionFloor error: ${data.error.message}`
        );
        throw new Error(
          `AlchemyService.getCollectionFloor error: ${data.error.message}`
        );
      }
      return data;
    } catch (e) {
      console.log(e);
      Sentry.captureException(e);
      throw new Error(`AlchemyService.getCollectionFloor error, ${e.message}`);
    }
  }

  /**
   * Verify if address owns at least one token of contractAddresses[]
   * @returns Promise<{Boolean}>
   */
  async verifyOwnership({
    contractAddresses,
    address,
    count = 1,
    attributeType,
    attributeValue,
    returnCount = false,
  }) {
    if (!address || !contractAddresses) return false;
    try {
      const result = await this.getNFTs({
        owner: address,
        contractAddresses: contractAddresses.length
          ? contractAddresses
          : [contractAddresses],
      });
      let totalCount = result?.totalCount || 0;

      if (attributeType && attributeValue) {
        const filtered = result?.ownedNfts?.filter((nft) => {
          const attributes = nft?.metadata?.attributes;
          const found = attributes?.find(
            (attr) => attr.trait_type === attributeType
          );
          if (!found) return false;
          return found?.value
            ?.toLowerCase()
            .includes(attributeValue.toLowerCase());
        });
        totalCount = filtered?.length;
      }
      if (!returnCount) {
        return totalCount >= count;
      }
      return totalCount;
    } catch (e) {
      Sentry.captureException(e, "AlchemyService.getOwnersForToken");
      return false;
    }
  }

  /**
   * @docs https://docs.alchemy.com/alchemy/apis/ethereum/eth-gettransactionbyhash
   * @returns Promise<{
   *  result: Transaction
   *  error?: Object
   *  id: String
   *  jsonrpc: String
   * }>
   */
  async getTransactionByHash({ hash, id }) {
    const opts = {
      timeout: TIMEOUT_MS,
    };
    const route = `${this.getBaseRoute()}`;
    const body = {
      jsonrpc: "2.0",
      id,
      method: "eth_getTransactionByHash",
      params: [hash],
    };

    try {
      const { data } = await axios.post(route, body, opts);
      if (data.error) {
        Sentry.captureException(
          `AlchemyService.getTransactionByHash error for id: ${data.id}, ${data.error.message}`
        );
        throw new Error(
          `AlchemyService.getTransactionByHash error for id: ${data.id}, ${data.error.message}`
        );
      }
      return data;
    } catch (e) {
      Sentry.captureException(e);
      throw new Error(
        `AlchemyService.getTransactionByHash error for id: ${id}, ${e.message}`
      );
    }
  }

  /**
   * @docs https://docs.alchemy.com/alchemy/apis/ethereum/eth-getblockbyhash
   * @returns Promise<{
   *  result: EthBlock
   *  error?: Object
   *  id: String
   *  jsonrpc: String
   * }>
   */
  async getBlockByHash({ hash, id, showFullTransaction = false }) {
    const opts = {
      timeout: TIMEOUT_MS,
    };
    const route = `${this.getBaseRoute()}`;
    const body = {
      jsonrpc: "2.0",
      id,
      method: "eth_getBlockByHash",
      params: [hash, showFullTransaction],
    };

    try {
      const { data } = await axios.post(route, body, opts);
      if (data.error) {
        Sentry.captureException(
          `AlchemyService.getBlockByHash error for id: ${data.id}, ${data.error.message}`
        );
        throw new Error(
          `AlchemyService.getBlockByHash error for id: ${data.id}, ${data.error.message}`
        );
      }
      return data;
    } catch (e) {
      Sentry.captureException(e);
      throw new Error(
        `AlchemyService.getBlockByHash error for id: ${id}, ${e.message}`
      );
    }
  }
  /**
   * @docs https://docs.alchemy.com/alchemy/apis/ethereum/eth-getblockbynumber
   * @returns Promise<{
   *  result: EthBlock
   *  error?: Object
   *  id: String
   *  jsonrpc: String
   * }>
   */
  async getBlockByNumber({ blockNum, id, showFullTransaction = false }) {
    const opts = {
      timeout: TIMEOUT_MS,
    };
    const route = `${this.getBaseRoute()}`;
    const body = {
      jsonrpc: "2.0",
      id,
      method: "eth_getBlockByNumber",
      params: [blockNum, showFullTransaction],
    };

    try {
      const { data } = await axios.post(route, body, opts);
      if (data.error) {
        Sentry.captureException(
          `AlchemyService.getBlockByNumber error for id: ${data.id}, ${data.error.message}`
        );
        throw new Error(
          `AlchemyService.getBlockByNumber error for id: ${data.id}, ${data.error.message}`
        );
      }
      return data;
    } catch (e) {
      Sentry.captureException(e);
      throw new Error(
        `AlchemyService.getBlockByNumber error for id: ${id}, ${e.message}`
      );
    }
  }

  /**
   * @docs https://docs.alchemy.com/alchemy/enhanced-apis/transfers-api
   * @returns Promise<{
   *  result: { pageKey: String, transfers: Transfer[] }
   *  error?: Object
   *  id: String
   *  jsonrpc: String
   * }>
   */
  async getAssetTransfers({
    fromBlock = "0x0",
    toBlock = "latest",
    fromAddress,
    toAddress,
    category,
    contractAddresses,
    id,
    pageKey,
    maxCount,
  }) {
    const opts = {
      timeout: TIMEOUT_MS,
    };
    const params = {
      fromBlock,
      toBlock,
    };
    if (fromAddress) params.fromAddress = fromAddress;
    if (toAddress) params.toAddress = toAddress;
    if (category) params.category = category;
    if (contractAddresses) params.contractAddresses = contractAddresses;
    if (pageKey) params.pageKey = pageKey;
    if (maxCount) params.maxCount = maxCount;
    const body = {
      jsonrpc: "2.0",
      id,
      method: "alchemy_getAssetTransfers",
      params: [params],
    };

    try {
      const { data } = await axios.post(this.getBaseRoute(), body, opts);
      if (data.error) {
        Sentry.captureException(
          `AlchemyService.getAssetTransfers error for id: ${data.id}, ${data.error.message}`
        );
        throw new Error(
          `AlchemyService.getAssetTransfers error for id: ${data.id}, ${data.error.message}`
        );
      }
      return data;
    } catch (e) {
      Sentry.captureException(e);
      throw new Error(
        `AlchemyService.getAssetTransfers error for id: ${id}, ${e.message}`
      );
    }
  }
}

module.exports = { Service: AlchemyService };
