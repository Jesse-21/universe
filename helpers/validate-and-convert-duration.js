const { ethers } = require("ethers");
const Sentry = require("@sentry/node");

/**
 * Validate address and convert it to a checksummed address
 * https://docs.ethers.io/v5/api/utils/address/
 * @returns String | Error
 */
const validateAndConvertDuration = (duration) => {
  if (!duration) throw new Error("Invalid duration");
  try {
    return ethers.BigNumber.from(duration).toString();
  } catch (e) {
    Sentry.captureException(e);
    throw new Error(e.message);
  }
};

module.exports = { validateAndConvertDuration };
