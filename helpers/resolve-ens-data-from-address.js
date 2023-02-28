const { getProvider } = require("./alchemy-provider");
const { validateAndConvertAddress } = require("./validate-and-convert-address");
const Sentry = require("@sentry/node");

const resolveEnsFromAddress = async (address) => {
  if (!address) throw new Error("Invalid address");

  const _provider = getProvider({
    network: "homestead",
    node: process.env.HOMESTEAD_NODE_URL,
  });

  try {
    const _address = validateAndConvertAddress(address);
    const ens = await _provider.lookupAddress(_address);
    return ens;
  } catch (e) {
    return null;
  }
};

const resolveEnsDataFromAddress = async (ensOrAddress) => {
  if (!ensOrAddress) throw new Error("Invalid ens or address");

  const _provider = getProvider({
    network: "homestead",
    node: process.env.HOMESTEAD_NODE_URL,
  });

  const _isEns = ensOrAddress.slice(-3) === "eth";
  let ens;
  if (_isEns) {
    ens = ensOrAddress;
  } else {
    const _address = validateAndConvertAddress(ensOrAddress);
    try {
      ens = await _provider.lookupAddress(_address);
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      return {
        ens: null,
        avatar: null,
        twitter: null,
        content: null,
      };
    }
  }

  const resolver = await _provider.getResolver(ens);
  const twitter = await resolver.getText("com.twitter");
  const avatar = await resolver.getAvatar();
  const content = await resolver.getContentHash();

  return {
    ens,
    avatar,
    avatarUrl: avatar?.url || null,
    twitter,
    content,
  };
};

module.exports = { resolveEnsDataFromAddress, resolveEnsFromAddress };
