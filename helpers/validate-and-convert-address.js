const { ethers } = require("ethers");

/**
 * Validate address and convert it to a checksummed address
 * https://docs.ethers.io/v5/api/utils/address/
 * @returns String | Error
 */
const validateAndConvertAddress = (address) => {
  if (!address) throw new Error("Invalid address");
  try {
    return ethers.utils.getAddress(address);
  } catch (e) {
    throw new Error(e.message);
  }
};

const isAddress = (query) => {
  if (!query) return false;
  try {
    validateAndConvertAddress(query);
    return true;
  } catch (e) {
    return false;
  }
};
const isENS = (query) => {
  if (!query) return false;
  try {
    return query?.slice?.(-4) === ".eth";
  } catch (e) {
    return false;
  }
};

module.exports = { validateAndConvertAddress, isAddress, isENS };
