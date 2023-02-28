const ethers = require("ethers");

const generateSecretFromAddressAndDuration = ({
  address,
  duration,
  bebdomain,
}) => {
  if (!address || !duration) throw new Error("Invalid address or duration");

  const secret = ethers.utils.solidityKeccak256(
    ["address", "uint256", "string", "string"],
    [
      address,
      ethers.BigNumber.from(duration),
      bebdomain,
      process.env.JWT_SECRET,
    ]
  );
  return secret;
};

module.exports = { generateSecretFromAddressAndDuration };
