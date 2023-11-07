const flagsDev = () => {
  return {
    USE_GATEWAYS: false,
  };
};

const flagsProd = () => {
  return {
    USE_GATEWAYS: false,
  };
};

const getFlags = () =>
  process.env.NODE_ENV === "production" ? flagsProd() : flagsDev();
module.exports = { flagsDev, flagsProd, getFlags };
