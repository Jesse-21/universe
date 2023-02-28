var { ethers } = require("ethers");
var crypto = require("crypto");

/**
 * Generate a random public ETH address
 * @returns String
 */
const getRandomAddress = () => {
  var id = crypto.randomBytes(32).toString("hex");
  var privateKey = "0x" + id;

  var wallet = new ethers.Wallet(privateKey);
  return wallet.address;
};

module.exports = {
  getRandomAddress,
};
