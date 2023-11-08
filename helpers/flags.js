const flagsDev = () => {
  return {
    USE_GATEWAYS: true,
  };
};

const flagsProd = () => {
  return {
    USE_GATEWAYS: true,
  };
};

const getFlags = () =>
  process.env.NODE_ENV === "production" ? flagsProd() : flagsDev();
module.exports = { flagsDev, flagsProd, getFlags };
