const { Service: _AlchemyService } = require("../services/AlchemyService");
const { prod } = require("../helpers/registrar");
const { Nft } = require("../models/wallet/Nft");
const { AccountInventory } = require("../models/AccountInventory");
const { Contract } = require("../models/wallet/Contract");

const chainToApiKey = {
  1: [prod().NODE_URL, prod().NODE_NETWORK],
  10: [prod().OPTIMISM_NODE_URL, prod().OPTIMISM_NODE_NETWORK],
};

// Placeholder for the makeNftRequest function
// This should be implemented to make additional requests to fetch NFTs
async function makeNftRequest({ pageKey, chain, walletAddress }) {
  const [nodeUrl, nodeNetwork] = chainToApiKey[chain];
  if (!nodeUrl || !nodeNetwork) {
    throw new Error("Invalid chain");
  }
  const AlchemyService = new _AlchemyService({
    apiKey: nodeUrl,
    chain: nodeNetwork,
  });
  const data = await AlchemyService.getNFTsV3({
    owner: walletAddress,
    pageKey,
  });
  return data;
}

async function processAndUpdateNFTs({ response, chainId, accountId }) {
  if (!response || !response.ownedNfts) {
    throw new Error("Invalid response structure");
  }

  for (const nftData of response.ownedNfts) {
    const contract = await Contract.findOneAndUpdate(
      { address: nftData.contract.address, chainId },
      {
        address: nftData.contract.address,
        contractDeployer: nftData.contract.contractDeployer,
        deployedBlockNumber: nftData.contract.deployedBlockNumber,
        name: nftData.contract.name,
        symbol: nftData.contract.symbol,
        tokenType: nftData.contract.tokenType,
        isSpam: nftData.contract.isSpam,
        metadata: {
          ...nftData.contract.openSeaMetadata,
        },
      },
      { upsert: true, new: true }
    );

    const updateData = {
      contract: contract._id,
      tokenId: nftData.tokenId,
      tokenType: nftData.tokenType,
      name: nftData.metadata?.name,
      description: nftData.metadata?.description,
      image: {
        ...nftData.image,
      },
      attributes: nftData.attributes?.attributes,
      lastUpdated: new Date(nftData.timeLastUpdated),
    };

    const newNft = await Nft.findOneAndUpdate(
      { contract: contract._id, tokenId: nftData.tokenId },
      updateData,
      { upsert: true, new: true }
    );
    const accountInventory = await AccountInventory.findOneAndUpdate(
      {
        account: accountId,
        rewardId: newNft._id,
        rewardType: "NFT",
      },
      {
        account: accountId,
        rewardId: newNft._id,
        rewardType: "NFT",
        lastBlockHash: response.lastBlockHash,
      },
      { upsert: true, new: true }
    );
  }

  // Handle pagination
  //   if (response.pageKey) {
  //     const nextPageResponse = await makeNftRequest(response.pageKey);
  //     await processAndUpdateNFTs(nextPageResponse, walletAddress);
  //   }
}

// 1. loop through all supported chains and update assets
// 2. delete all account inventory item that does not have the correct lastBlockHash, means they are e.g. transferred
async function getAssets() {}
