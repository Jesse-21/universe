const { getProvider } = require("./alchemy-provider");
const { validateAndConvertAddress } = require("./validate-and-convert-address");

const getAddressFromEnsOrAddress = async (ensOrAddress) => {
  if (!ensOrAddress) throw new Error("Invalid ens or address");

  const _isEns = ensOrAddress.slice(-3) === "eth";
  const _provider = getProvider({
    network: "homestead",
    node: process.env.HOMESTEAD_NODE_URL,
  });
  let address = ensOrAddress;
  if (_isEns) address = await _provider.resolveName(ensOrAddress);

  return validateAndConvertAddress(address);
};

module.exports = { getAddressFromEnsOrAddress };
