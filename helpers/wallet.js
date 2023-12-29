const { Service: _AlchemyService } = require("../services/AlchemyService");
const { config, prod } = require("../helpers/registrar");
const { Nft } = require("../models/wallet/Nft");

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
}

async function processAndUpdateNFTs({ response }) {
  if (!response || !response.ownedNfts) {
    throw new Error("Invalid response structure");
  }

  for (const nftData of response.ownedNfts) {
    const updateData = {
      walletAddress: walletAddress,
      contractAddress: nftData.contract.address,
      tokenId: nftData.tokenId,
      tokenType: nftData.tokenType,
      name: nftData.contract.name,
      symbol: nftData.contract.symbol,
      image: {
        ...nftData.image,
      },

      metadata: {
        name: nftData.contract.name,
        symbol: nftData.contract.symbol,
        imageUrl: nftData.image.originalUrl,
        // ...other relevant metadata fields
      },
      lastUpdated: new Date(nftData.timeLastUpdated),
    };

    await Nft.findOneAndUpdate(
      { walletAddress, tokenId: nftData.tokenId },
      updateData,
      { upsert: true, new: true }
    );
  }

  // Handle pagination
  if (response.pageKey) {
    const nextPageResponse = await makeNftRequest(response.pageKey);
    await processAndUpdateNFTs(nextPageResponse, walletAddress);
  }
}
