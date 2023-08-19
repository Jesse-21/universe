const fetch = require("node-fetch");

class WarpcastError extends Error {
  constructor(message) {
    super(JSON.stringify(message));
    this.name = "WarpcastError";
  }
}

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

const getAllRecentCasts = async ({ token, limit }) => {
  let url = `https://api.warpcast.com/v2/recent-casts?limit=${limit}`;
  const response = await fetchRetry(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
    timeout: 5_000,
  });
  const json = await response.json();
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
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
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return { cast: json?.result?.cast };
};

const getCustodyAddress = async ({ token, fid }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/custody-address?fid=${fid}`,
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

  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return { custodyAddress: json?.result?.custodyAddress };
};

const getAllCastsInThread = async ({ token, threadHash }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/all-casts-in-thread?threadHash=${threadHash}`,
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
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return { casts: json?.result?.casts };
};

const getCasts = async ({ token, fid, limit, cursor }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/casts?fid=${fid}&limit=${limit}${
      cursor ? "&cursor=" + cursor : ""
    }`,
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
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    casts: json?.result?.casts,
    next: json?.next,
  };
};

const postCasts = async ({ token, text, parentHash }) => {
  const response = await fetchRetry(`https://api.warpcast.com/v2/casts`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
    timeout: 5_000,
    body: {
      text,
      parent: {
        hash: parentHash,
      },
    },
  });
  const json = await response.json();
  return { casts: json?.result?.casts, next: json?.next };
};

const deleteCasts = async ({ token, castHash }) => {
  const response = await fetchRetry(`https://api.warpcast.com/v2/casts`, {
    method: "DELETE",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
    timeout: 5_000,
    body: {
      castHash,
    },
  });
  const json = await response.json();
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    success: json?.result?.success,
  };
};

const getCastReactions = async ({ token, castHash, limit, cursor }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/cast-reactions?castHash=${castHash}&limit=${limit}${
      cursor ? "&cursor=" + cursor : ""
    }`,
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
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    reactions: json?.result?.reactions,
    next: json?.next,
  };
};

const getCastLikes = async ({ token, castHash, limit, cursor }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/cast-likes?castHash=${castHash}&limit=${limit}${
      cursor ? "&cursor=" + cursor : ""
    }`,
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
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    likes: json?.result?.likes,
    next: json?.next,
  };
};

const putCastLikes = async ({ token, castHash }) => {
  const response = await fetchRetry(`https://api.warpcast.com/v2/cast-likes`, {
    method: "PUT",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
    timeout: 5_000,
    body: {
      castHash,
    },
  });
  const json = await response.json();
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    reaction: json?.result?.reaction,
  };
};

const deleteCastLikes = async ({ token, castHash }) => {
  const response = await fetchRetry(`https://api.warpcast.com/v2/cast-likes`, {
    method: "DELETE",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
    timeout: 5_000,
    body: {
      castHash,
    },
  });
  const json = await response.json();
  return {
    success: json?.result?.success,
    errors: json?.errors,
  };
};

const getCastRecasters = async ({ token, castHash, limit, cursor }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/cast-recasters?castHash=${castHash}&limit=${limit}${
      cursor ? "&cursor=" + cursor : ""
    }`,
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
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    users: json?.result?.users,
    next: json?.next,
  };
};

const putRecasts = async ({ token, castHash }) => {
  const response = await fetchRetry(`https://api.warpcast.com/v2/recasts`, {
    method: "PUT",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
    timeout: 5_000,
    body: {
      castHash,
    },
  });
  const json = await response.json();
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    castHash: json?.result?.castHash,
  };
};

const deleteRecasts = async ({ token, castHash }) => {
  const response = await fetchRetry(`https://api.warpcast.com/v2/recasts`, {
    method: "DELETE",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
    timeout: 5_000,
    body: {
      castHash,
    },
  });
  const json = await response.json();
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    success: json?.result?.success,
  };
};

const getFollowers = async ({ token, fid, limit, cursor }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/followers?fid=${fid}&limit=${limit}${
      cursor ? "&cursor=" + cursor : ""
    }`,
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
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    users: json?.result?.users,
    next: json?.next,
  };
};

const putFollowing = async ({ token, castHash }) => {
  const response = await fetchRetry(`https://api.warpcast.com/v2/following`, {
    method: "PUT",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
    timeout: 5_000,
    body: {
      castHash,
    },
  });
  const json = await response.json();
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    castHash: json?.result?.castHash,
  };
};

const deleteFollowing = async ({ token, castHash }) => {
  const response = await fetchRetry(`https://api.warpcast.com/v2/following`, {
    method: "DELETE",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
    timeout: 5_000,
    body: {
      castHash,
    },
  });
  const json = await response.json();
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    success: json?.result?.success,
  };
};

const getFollowing = async ({ token, fid, limit, cursor }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/following?fid=${fid}&limit=${limit}${
      cursor ? "&cursor=" + cursor : ""
    }`,
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
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    users: json?.result?.users,
    next: json?.next,
  };
};

const getCurrentUser = async ({ token }) => {
  const response = await fetchRetry(`https://api.warpcast.com/v2/me`, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
    timeout: 5_000,
  });
  const json = await response.json();
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    user: json?.result?.user,
  };
};

const getUser = async ({ token, fid }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/user?fid=${fid}`,
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
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    user: json?.result?.user,
  };
};

const getUserByUsername = async ({ token, username }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/user-by-username?username=${username}`,
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
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    user: json?.result?.user,
  };
};

const getMentionAndReplyNotifications = async ({ token, limit, cursor }) => {
  const response = await fetchRetry(
    `https://api.warpcast.com/v2/mention-and-reply-notifications?limit=${limit}${
      cursor ? "&cursor=" + cursor : ""
    }`,
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
  if (json?.errors) {
    throw new WarpcastError(json?.errors);
  }
  return {
    notifications: json?.result?.notifications,
    next: json?.next,
  };
};

module.exports = {
  getAllRecentCasts,
  getCast,
  getCasts,
  postCasts,
  deleteCasts,
  getCastReactions,
  getCastLikes,
  putCastLikes,
  deleteCastLikes,
  getCastRecasters,
  putRecasts,
  deleteRecasts,
  getFollowers,
  putFollowing,
  deleteFollowing,
  getFollowing,
  getUser,
  getUserByUsername,
  getMentionAndReplyNotifications,
  getAllCastsInThread,
  getCustodyAddress,
  getCurrentUser,
};
