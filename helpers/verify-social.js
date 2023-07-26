const axios = require("axios").default;
const axiosRetry = require("axios-retry");
axiosRetry(axios, { retries: 3 });

const TIMEOUT = 10000;

/** verify if tweet contains text */
const verifyTwitter = async (url, text) => {
  const { data } = await axios.get(
    `https://publish.twitter.com/oembed?url=${url}`,
    {
      timeout: TIMEOUT,
    }
  );
  const html = data.html;
  return html.includes(text);
};

module.exports = {
  verifyTwitter,
};
