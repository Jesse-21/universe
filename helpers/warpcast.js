const fetch = require("node-fetch");

const fetchRetry = async (url, options, retries = 3) => {
  let error;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (e) {
      error = e;
    }
    // wait N seconds exponentially
    await new Promise((r) => setTimeout(r, 2 ** (i + 1) * 1000));
  }
  throw error;
};

const getAllRecentCasts = async ({ token }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/recent-casts?limit=1000`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
      timeout: 5_000,
    }
  );
  const json = await response.json();
  return { casts: json?.result?.casts };
};

const getCast = async ({ token, hash }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/cast?hash=${hash}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
      timeout: 5_000,
    }
  );
  const json = await response.json();
  return { cast: json?.result?.cast };
};

const getCasts = async ({ token, fid, limit, cursor }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/casts?fid=${fid}&limit=${limit}&cursor=${cursor}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
      timeout: 5_000,
    }
  );
  const json = await response.json();
  return { casts: json?.result?.casts, next: json?.result?.next };
};

module.exports = {
  getAllRecentCasts,
  getCast,
  getCasts,
};
