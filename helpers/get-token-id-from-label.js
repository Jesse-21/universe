const ethers = require("ethers");

const getTokenIdFromLabel = (label) => {
  if (!label) return null;
  const labelHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(label));
  const tokenId = ethers.BigNumber.from(labelHash).toString();
  return tokenId;
};

const getHexTokenIdFromLabel = (label) => {
  if (!label) return null;
  const labelHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(label));
  const tokenId = ethers.BigNumber.from(labelHash).toHexString();
  return tokenId;
};

module.exports = { getTokenIdFromLabel, getHexTokenIdFromLabel };
