const { Service: _AlchemyService } = require("../services/AlchemyService");
const { prod } = require("../helpers/registrar");
const { Token } = require("../models/wallet/Token");
const { AccountInventory } = require("../models/AccountInventory");
const { Contract } = require("../models/wallet/Contract");
const { Alchemy, Network, TokenBalanceType } = require("alchemy-sdk");
const { getMemcachedClient, getHash } = require("../connectmemcached");

// TODO:
// 1. loop through all supported chains and update assets
// 2. delete all account inventory item that does not have the correct lastBlockHash, means they are e.g. transferred
async function getAccountAssets() {}

async function getOnchainNFTs(
  address,
  network,
  cursor,
  limit = DEFAULT_NFT_LIMIT
) {
  const memcached = getMemcachedClient();
  try {
    const data = await memcached.get(
      getHash(`Wallet_getOnchainNFTs:${network}:${address}`)
    );
    if (data) {
      return JSON.parse(data.value);
    }
  } catch (e) {
    console.error(e);
  }

  const config = {
    apiKey: prod().NODE_URL,
    network,
  };

  const alchemy = new Alchemy(config);
  const params = {
    pageSize: limit,
  };
  if (cursor) {
    params.cursor = cursor;
  }
  const response = await alchemy.nft.getNftsForOwner(address, params);

  try {
    await memcached.set(
      getHash(`Wallet_getOnchainNFTs:${network}:${address}`),
      JSON.stringify(response),
      { lifetime: 24 * 60 * 60 } // 24 hours
    );
  } catch (e) {
    console.error(e);
  }

  return response;
}

async function getOnchainTokenMetadata(contractAddress, network) {
  const config = {
    apiKey: prod().NODE_URL,
    network,
  };
  const alchemy = new Alchemy(config);
  const memcached = getMemcachedClient();
  try {
    const data = await memcached.get(
      getHash(`Wallet_getOnchainTokenMetadata:${contractAddress}`)
    );
    if (data) {
      return JSON.parse(data.value);
    }
  } catch (e) {
    console.error(e);
  }

  const response = await alchemy.core.getTokenMetadata(contractAddress);

  try {
    await memcached.set(
      getHash(`Wallet_getOnchainTokenMetadata:${contractAddress}`),
      JSON.stringify(response),
      { lifetime: 24 * 60 * 60 } // 24 hours
    );
  } catch (e) {
    console.error(e);
  }

  return response;
}

// get all tokens owned by a wallet
async function getOnchainTokens(
  address,
  network,
  limit = DEFAULT_LIMIT,
  cursor = null,
  filterNoSymbol = DEFAULT_FILTER_NO_SYMBOL
) {
  const config = {
    apiKey: prod().NODE_URL,
    network,
  };
  const memcached = getMemcachedClient();

  try {
    const data = await memcached.get(
      getHash(
        `Wallet_getOnchainTokens:${limit}:${network}:${cursor}:${address}:${filterNoSymbol}`
      )
    );
    if (data) {
      return JSON.parse(data.value);
    }
  } catch (e) {
    console.error(e);
  }

  const alchemy = new Alchemy(config);
  const params = {
    type: TokenBalanceType.ERC20,
    pageSize: limit,
  };
  if (cursor) {
    params.pageKey = cursor;
  }
  const response = await alchemy.core.getTokenBalances(address, params);

  // for each token, get the token metadata with Promise.all and set it to response
  const tokenMetadataPromises = response.tokenBalances.map((token) =>
    getOnchainTokenMetadata(token.contractAddress, network)
  );

  const tokenMetadata = await Promise.all(tokenMetadataPromises);
  response.tokenBalances = response.tokenBalances.map((token, index) => ({
    ...token,
    metadata: tokenMetadata[index],
  }));

  // Filter out tokens with no symbol
  response.tokenBalances = response.tokenBalances.filter(
    (token) => token.metadata?.symbol
  );

  try {
    await memcached.set(
      getHash(
        `Wallet_getOnchainTokens:${limit}:${network}:${cursor}:${address}:${filterNoSymbol}`
      ),
      JSON.stringify(response),
      { lifetime: 60 * 60 } // 1 hour
    );
  } catch (e) {
    console.error(e);
  }

  // get all token balances, and retrieve relevant token data
  return response;
}

async function getOnchainTransactions(
  address,
  network,
  cursor = null,
  category = ["external", "erc20", "erc721", "erc1155"],
  fromBlock = "0x0",
  limit = DEFAULT_LIMIT
) {
  const config = {
    apiKey: prod().NODE_URL,
    network,
  };
  const memcached = getMemcachedClient();
  try {
    const data = await memcached.get(
      getHash(
        `Wallet_getOnchainTransactions:${limit}:${network}:${cursor}:${address}`
      )
    );
    if (data) {
      return JSON.parse(data.value);
    }
  } catch (e) {
    console.error(e);
  }
  const alchemy = new Alchemy(config);
  const params = {
    fromBlock,
    toAddress: address,
    excludeZeroValue: true,
    category,
    limit,
  };
  if (cursor) {
    params.pageKey = cursor;
  }
  const response = await alchemy.core.getAssetTransfers(params);

  try {
    await memcached.set(
      getHash(
        `Wallet_getOnchainTransactions:${limit}:${network}:${cursor}:${address}`
      ),
      JSON.stringify(response),
      { lifetime: 60 * 60 } // 1 hour
    );
  } catch (e) {
    console.error(e);
  }

  return response;
}

const DEFAULT_NETWORKS = [
  Network.ETH_MAINNET,
  Network.OPT_MAINNET,
  Network.BASE_MAINNET,
  Network.MATIC_MAINNET,
];

const DEFAULT_CURSOR = null;

const DEFAULT_CURSORS = [
  DEFAULT_CURSOR,
  DEFAULT_CURSOR,
  DEFAULT_CURSOR,
  DEFAULT_CURSOR,
];

const DEFAULT_LIMIT = 100;
const DEFAULT_NFT_LIMIT = 10;

const SKIP_CURSOR = "skip";

const DEFAULT_FILTER_NO_SYMBOL = true;

module.exports = {
  getAccountAssets,
  getOnchainTokens,
  getOnchainTransactions,
  getOnchainNFTs,
  DEFAULT_NETWORKS,
  DEFAULT_LIMIT,
  DEFAULT_CURSOR,
  DEFAULT_CURSORS,
  SKIP_CURSOR,
  DEFAULT_FILTER_NO_SYMBOL,
};
