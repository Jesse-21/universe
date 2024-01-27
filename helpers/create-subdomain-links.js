const dev = {
  COOKIE_DOMAIN: ".localhost",
  URL_PREFIX: "http://",
  URL_SUFFIX: ":3000",
};

const prod = {
  COOKIE_DOMAIN: ".wield.co",
  URL_PREFIX: "https://",
  URL_SUFFIX: "",
};

const config = process.env.NODE_ENV === "production" ? prod : dev;

const makeSubdomainLinks = ({ subdomain, path }) => {
  if (!subdomain) {
    return `${config.URL_PREFIX}${config.COOKIE_DOMAIN.slice(1)}${
      config.URL_SUFFIX
    }${path}`;
  }

  return (
    config.URL_PREFIX +
    subdomain +
    config.COOKIE_DOMAIN +
    config.URL_SUFFIX +
    path
  );
};

module.exports = { makeSubdomainLinks };
