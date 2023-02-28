const { ethers } = require("ethers");

const getMessageHash = (recipient, amount, nonce, _contractAddress) => {
  const hash = ethers.utils.solidityKeccak256(
    ["address", "uint256", "uint256", "address"],
    [recipient, amount, nonce, _contractAddress]
  );
  const messageHashBinary = ethers.utils.arrayify(hash);
  return messageHashBinary;
};

module.exports = { getMessageHash };
