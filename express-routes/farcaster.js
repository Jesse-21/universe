const app = require("express").Router();
const Sentry = require("@sentry/node");

const rateLimit = require("express-rate-limit");
const { Service: _CacheService } = require("../services/cache/CacheService");

const {
  getFarcasterUserByFid,
  getFarcasterUserByUsername,
  getFarcasterCastByHash,
  getFarcasterAllCastsInThread,
  getFarcasterCasts,
  getFarcasterFollowing,
  getFarcasterFollowers,
  getFarcasterCastReactions,
  getFarcasterCastLikes,
  getFarcasterCastRecasters,
  getFarcasterCastByShortHash,
  getFarcasterFeed,
} = require("../helpers/farcaster");

const {
  getAllRecentCasts,
  getAllCastsInThread,
  getCast,
  getCasts,
  postCasts,
  deleteCasts,
  getCastReactions,
  getCastLikes,
  putCastLikes,
  deleteCastLikes,
  getCastRecasters,
  deleteRecasts,
  putRecasts,
  getFollowers,
  putFollowing,
  deleteFollowing,
  getFollowing,
  getUser,
  getUserByUsername,
  getMentionAndReplyNotifications,
  getCustodyAddress,
} = require("../helpers/warpcast");

const { Messages } = require("../models/farcaster");

const {
  Message: MessageFarcaster,
  getSSLHubRpcClient,
  fromFarcasterTime,
} = require("@farcaster/hub-nodejs");

const { requireAuth } = require("../helpers/auth-middleware");

const assert = require("assert");

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 3_000, // 3s
  max: 50, // limit each IP to 50 requests per windowMs
  message: "Too many requests, please try again later.",
});

const CacheService = new _CacheService();

const FARCASTER_KEY = "farcaster-express-endpoint";

const WARPCAST_SIGNIN_READY =
  process.env.NODE_ENV === "production" ? false : true; // We need warpcast signin since we are using @farquest

const authRequired = async (req, res, next) => {
  try {
    const data = await requireAuth(req.headers.authorization?.slice(7) || "");
    assert(!req.header.accountId, "accountId already exists in req.header");
    req.header.accountId = data.payload.id;
    next();
  } catch (e) {
    try {
      if (!e.message.includes("jwt must be provided")) {
        Sentry.captureException(e);
        console.error(e);
      }
      return res.status(403).json({
        error: "Unauthorized",
      });
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      return res.status(403).json({
        error: "Unauthorized",
      });
    }
  }
};

function farcasterTimeToDate(time) {
  if (time === undefined) return undefined;
  if (time === null) return null;
  const result = fromFarcasterTime(time);
  if (result.isErr()) throw result.error;
  return new Date(result.value);
}

function bytesToHex(bytes) {
  if (bytes === undefined) return undefined;
  if (bytes === null) return null;
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

const v1feed = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 20);
    const cursor = req.query.cursor || null;

    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { route: "feed", cursor },
    });
    if (data) {
      return res.json({
        result: { casts: data.casts },
        next: { cursor: null },
        source: "v1",
      });
    }

    data = await getAllRecentCasts({
      token:
        req.headers["WARPCAST_TOKEN"] ||
        process.env.FARQUEST_FARCASTER_APP_TOKEN,
      limit,
      cursor,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { route: "feed", cursor },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { casts: data.casts },
      next: { cursor: null },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.get("/v1/feed", limiter, v1feed);

app.get("/v2/feed", limiter, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 20);
    const cursor = req.query.cursor || null;

    let [casts, next] = await getFarcasterFeed(limit, cursor);

    return res.json({
      result: { casts },
      next,
      source: "v2",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

const v1cast = async (req, res) => {
  try {
    let hash = req.query.hash;
    if (!hash) {
      return res.status(400).json({
        error: "Missing hash",
      });
    }
    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { hash, route: "cast" },
    });
    if (data) {
      return res.json({
        result: { cast: data.cast },
        source: "v1",
      });
    }

    data = await getCast({
      token:
        req.headers["WARPCAST_TOKEN"] ||
        process.env.FARQUEST_FARCASTER_APP_TOKEN,
      hash,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { hash, route: "cast" },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { cast: data.cast },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.get("/v1/cast", limiter, v1cast);

app.get("/v2/cast", limiter, async (req, res) => {
  try {
    let hash = req.query.hash;
    if (!hash) {
      return res.status(400).json({
        error: "Missing hash",
      });
    }

    const cast = await getFarcasterCastByHash(hash);

    return res.json({
      result: { cast },
      source: "v2",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.get("/v2/cast-short", limiter, async (req, res) => {
  try {
    let shortHash = req.query.shortHash;
    let username = req.query.username;
    if (!shortHash || !username) {
      return res.status(400).json({
        error: "Missing hash or username",
      });
    }

    const cast = await getFarcasterCastByShortHash(shortHash, username);

    return res.json({
      result: { cast },
      source: "v2",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

const v1custodyAddress = async (req, res) => {
  try {
    let fid = req.query.fid;
    if (!fid) {
      return res.status(400).json({
        error: "Missing fid",
      });
    }
    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { fid, route: "custody-address" },
    });
    if (data) {
      return res.json({
        result: { custodyAddress: data.custodyAddress },
        source: "v1",
      });
    }

    data = await getCustodyAddress({
      token:
        req.headers["WARPCAST_TOKEN"] ||
        process.env.FARQUEST_FARCASTER_APP_TOKEN,
      fid,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { fid, route: "custody-address" },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 1 month cache
    });

    return res.json({
      result: { custodyAddress: data.custodyAddress },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.get("/v1/custody-address", limiter, v1custodyAddress);

const v1AllCastInThread = async (req, res) => {
  try {
    let threadHash = req.query.threadHash;
    if (!threadHash) {
      return res.status(400).json({
        error: "Missing threadHash",
      });
    }
    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { threadHash, route: "all-casts-in-thread" },
    });
    if (data) {
      return res.json({
        result: { casts: data.casts },
        source: "v1",
      });
    }

    data = await getAllCastsInThread({
      token:
        req.headers["WARPCAST_TOKEN"] ||
        process.env.FARQUEST_FARCASTER_APP_TOKEN,
      threadHash,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { threadHash, route: "all-casts-in-thread" },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { casts: data.casts },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.get("/v1/all-casts-in-thread", limiter, v1AllCastInThread);

app.get("/v2/all-casts-in-thread", limiter, async (req, res) => {
  try {
    let threadHash = req.query.threadHash;
    if (!threadHash) {
      return res.status(400).json({
        error: "Missing threadHash",
      });
    }

    const casts = await getFarcasterAllCastsInThread(threadHash);

    return res.json({
      result: { casts },
      source: "v2",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

const v1GetCasts = async (req, res) => {
  try {
    const fid = req.query.fid;
    const limit = parseInt(req.query.limit || 10);
    const cursor = req.query.cursor || null;

    if (!fid) {
      return res.status(400).json({
        error: "fid is invalid",
      });
    }

    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { fid, limit, cursor, route: "casts" },
    });
    if (data) {
      return res.json({
        result: { casts: data.casts, next: data.next },
        source: "v1",
      });
    }

    data = await getCasts({
      token:
        req.headers["WARPCAST_TOKEN"] ||
        process.env.FARQUEST_FARCASTER_APP_TOKEN,
      fid,
      limit,
      cursor,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { fid, limit, cursor, route: "casts" },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 1), // 1 minute cache
    });

    return res.json({
      result: { casts: data.casts },
      next: data.next,
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.get("/v1/casts", limiter, v1GetCasts);

app.get("/v2/casts", limiter, async (req, res) => {
  try {
    const fid = req.query.fid;
    const limit = Math.min(req.query.limit || 10, 100);
    const cursor = parseInt(req.query.cursor || null);

    if (!fid) {
      return res.status(400).json({
        error: "fid is invalid",
      });
    }

    let [casts, next] = await getFarcasterCasts(fid, limit, cursor);

    return res.json({
      result: { casts },
      next,
      source: "v2",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

const v1PostCasts = async (req, res) => {
  try {
    const parentHash = req.query.parentHash;
    const text = req.query.text;

    if (!text || text.length > 320) {
      return res.status(400).json({
        error: "Text is invalid",
      });
    }

    let cast = {};

    if (WARPCAST_SIGNIN_READY) {
      const data = await postCasts({
        token: req.headers["WARPCAST_TOKEN"],
        parentHash,
        text,
      });
      cast = data.casts;
    }

    return res.json({
      result: { cast },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.post("/v1/casts", limiter, authRequired, v1PostCasts);

const v1DeleteCasts = async (req, res) => {
  try {
    const castHash = req.query.castHash;

    if (!castHash) {
      return res.status(400).json({
        error: "castHash is invalid",
      });
    }

    if (WARPCAST_SIGNIN_READY) {
      await deleteCasts({
        token: req.headers["WARPCAST_TOKEN"],
        castHash,
      });
    }

    return res.json({
      result: { success: true },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.delete("/v1/casts", limiter, v1DeleteCasts);

const v1CastReactions = async (req, res) => {
  try {
    const castHash = req.query.castHash;
    const limit = parseInt(req.query.limit || 100);
    const cursor = req.query.cursor || null;

    if (!castHash) {
      return res.status(400).json({
        error: "castHash is invalid",
      });
    }

    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { castHash, limit, cursor, route: "cast-reactions" },
    });
    if (data) {
      return res.json({
        result: { reactions: data.reactions, next: data.next },
        source: "v1",
      });
    }

    data = await getCastReactions({
      token:
        req.headers["WARPCAST_TOKEN"] ||
        process.env.FARQUEST_FARCASTER_APP_TOKEN,
      castHash,
      limit,
      cursor,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { castHash, limit, cursor, route: "cast-reactions" },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { reactions: data.reactions, next: data.next },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.get("/v1/cast-reactions", limiter, v1CastReactions);

app.get("/v2/cast-reactions", limiter, async (req, res) => {
  try {
    const castHash = req.query.castHash;
    const limit = Math.min(parseInt(req.query.limit || 100), 250);
    const cursor = req.query.cursor || null;

    if (!castHash) {
      return res.status(400).json({
        error: "castHash is invalid",
      });
    }

    const [reactions, next] = await getFarcasterCastReactions(
      castHash,
      limit,
      cursor
    );

    return res.json({
      result: {
        reactions,
        next,
      },
      source: "v2",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

const v1GetCastLikes = async (req, res) => {
  try {
    const castHash = req.query.castHash;
    const limit = parseInt(req.query.limit || 100);
    const cursor = req.query.cursor || null;

    if (!castHash) {
      return res.status(400).json({
        error: "castHash is invalid",
      });
    }

    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { castHash, limit, cursor, route: "cast-likes" },
    });
    if (data) {
      return res.json({
        result: { likes: data.likes, next: data.next },
        source: "v1",
      });
    }

    data = await getCastLikes({
      token:
        req.headers["WARPCAST_TOKEN"] ||
        process.env.FARQUEST_FARCASTER_APP_TOKEN,
      castHash,
      limit,
      cursor,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { castHash, limit, cursor, route: "cast-likes" },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { likes: data.likes, next: data.next },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.get("/v1/cast-likes", limiter, v1GetCastLikes);

app.get("/v2/cast-likes", limiter, async (req, res) => {
  try {
    const castHash = req.query.castHash;
    const limit = Math.min(parseInt(req.query.limit || 100), 250);
    const cursor = req.query.cursor || null;

    if (!castHash) {
      return res.status(400).json({
        error: "castHash is invalid",
      });
    }

    const [likes, next] = await getFarcasterCastLikes(castHash, limit, cursor);

    return res.json({
      result: { likes, next },
      source: "v2",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

const v1PutCastLikes = async (req, res) => {
  try {
    const castHash = req.query.castHash;

    if (!castHash) {
      return res.status(400).json({
        error: "castHash is invalid",
      });
    }

    let reaction = {};

    if (WARPCAST_SIGNIN_READY) {
      const data = await putCastLikes({
        token: req.headers["WARPCAST_TOKEN"],
        castHash,
      });
      reaction = data.reaction;
    }

    return res.json({
      result: { reaction },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.put("/v1/cast-likes", limiter, v1PutCastLikes);

const v1DeleteCastLikes = async (req, res) => {
  try {
    const castHash = req.query.castHash;

    if (!castHash) {
      return res.status(400).json({
        error: "castHash is invalid",
      });
    }

    if (WARPCAST_SIGNIN_READY) {
      await deleteCastLikes({
        token: req.headers["WARPCAST_TOKEN"],
        castHash,
      });
    }

    return res.json({
      result: { success: true },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.delete("/v1/cast-likes", limiter, v1DeleteCastLikes);

const v1CastRecasters = async (req, res) => {
  try {
    const castHash = req.query.castHash;
    const limit = parseInt(req.query.limit || 100);
    const cursor = req.query.cursor || null;

    if (!castHash) {
      return res.status(400).json({
        error: "castHash is invalid",
      });
    }

    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { castHash, limit, cursor, route: "cast-recasters" },
    });
    if (data) {
      return res.json({
        result: { users: data.users, next: data.next },
        source: "v1",
      });
    }

    data = await getCastRecasters({
      token:
        req.headers["WARPCAST_TOKEN"] ||
        process.env.FARQUEST_FARCASTER_APP_TOKEN,
      castHash,
      limit,
      cursor,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { castHash, limit, cursor, route: "cast-recasters" },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { users: data.users, next: data.next },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.get("/v1/cast-recasters", limiter, v1CastRecasters);

app.get("/v2/cast-recasters", limiter, async (req, res) => {
  try {
    const castHash = req.query.castHash;
    const limit = Math.min(parseInt(req.query.limit || 100), 250);
    const cursor = req.query.cursor || null;

    if (!castHash) {
      return res.status(400).json({
        error: "castHash is invalid",
      });
    }

    const [users, next] = await getFarcasterCastRecasters(
      castHash,
      limit,
      cursor
    );

    return res.json({
      result: { users, next },
      source: "v2",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

const v1PutRecasts = async (req, res) => {
  try {
    const castHash = req.query.castHash;

    if (!castHash) {
      return res.status(400).json({
        error: "castHash is invalid",
      });
    }

    if (WARPCAST_SIGNIN_READY) {
      await putRecasts({
        token: req.headers["WARPCAST_TOKEN"],
        castHash,
      });
    }

    return res.json({
      result: { castHash },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.put("/v1/recasts", limiter, v1PutRecasts);

const v1DeleteRecasts = async (req, res) => {
  try {
    const castHash = req.query.castHash;

    if (!castHash) {
      return res.status(400).json({
        error: "castHash is invalid",
      });
    }

    if (WARPCAST_SIGNIN_READY) {
      await deleteRecasts({
        token: req.headers["WARPCAST_TOKEN"],
        castHash,
      });
    }

    return res.json({
      result: { success: true },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.delete("/v1/recasts", limiter, v1DeleteRecasts);

const v1GetFollowers = async (req, res) => {
  try {
    const fid = req.query.fid;
    const limit = parseInt(req.query.limit || 100);
    const cursor = req.query.cursor || null;

    if (!fid) {
      return res.status(400).json({
        error: "fid is invalid",
      });
    }

    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { fid, limit, cursor, route: "followers" },
    });
    if (data) {
      return res.json({
        result: { users: data.users, next: data.next },
        source: "v1",
      });
    }

    data = await getFollowers({
      token:
        req.headers["WARPCAST_TOKEN"] ||
        process.env.FARQUEST_FARCASTER_APP_TOKEN,
      fid,
      limit,
      cursor,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { fid, limit, cursor, route: "followers" },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { users: data.users, next: data.next },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.get("/v1/followers", limiter, v1GetFollowers);

app.get("/v2/followers", limiter, async (req, res) => {
  try {
    const fid = req.query.fid;
    const limit = Math.min(parseInt(req.query.limit || 100), 250);
    const cursor = req.query.cursor || null;

    if (!fid) {
      return res.status(400).json({
        error: "fid is invalid",
      });
    }

    const [users, next] = await getFarcasterFollowers(fid, limit, cursor);

    return res.json({
      result: { users, next },
      source: "v2",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

const v1PutFollowing = async (req, res) => {
  try {
    const fid = req.query.fid;

    if (!fid) {
      return res.status(400).json({
        error: "fid is invalid",
      });
    }

    if (WARPCAST_SIGNIN_READY) {
      await putFollowing({
        token: req.headers["WARPCAST_TOKEN"],
        fid,
      });
    }

    return res.json({
      result: { success: true },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.put("/v1/following", limiter, v1PutFollowing);

const v1DeleteFollowing = async (req, res) => {
  try {
    const fid = req.query.fid;

    if (!fid) {
      return res.status(400).json({
        error: "fid is invalid",
      });
    }

    if (WARPCAST_SIGNIN_READY) {
      await deleteFollowing({
        token: req.headers["WARPCAST_TOKEN"],
        fid,
      });
    }

    return res.json({
      result: { success: true },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.delete("/v1/following", limiter, v1DeleteFollowing);

const v1GetFollowing = async (req, res) => {
  try {
    const fid = req.query.fid;
    const limit = parseInt(req.query.limit || 100);
    const cursor = req.query.cursor || null;

    if (!fid) {
      return res.status(400).json({
        error: "fid is invalid",
      });
    }

    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { fid, limit, cursor, route: "following" },
    });
    if (data) {
      return res.json({
        result: { users: data.users, next: data.next },
        source: "v1",
      });
    }

    data = await getFollowing({
      token:
        req.headers["WARPCAST_TOKEN"] ||
        process.env.FARQUEST_FARCASTER_APP_TOKEN,
      fid,
      limit,
      cursor,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { fid, limit, cursor, route: "following" },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { users: data.users, next: data.next },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.get("/v1/following", limiter, v1GetFollowing);

app.get("/v2/following", limiter, async (req, res) => {
  try {
    const fid = req.query.fid;
    const limit = Math.min(parseInt(req.query.limit || 100), 250);
    const cursor = req.query.cursor || null;

    if (!fid) {
      return res.status(400).json({
        error: "fid is invalid",
      });
    }

    const [users, next] = await getFarcasterFollowing(fid, limit, cursor);

    return res.json({
      result: { users, next },
      source: "v2",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

const v1GetUser = async (req, res) => {
  try {
    const fid = req.query.fid;

    if (!fid) {
      return res.status(400).json({
        error: "fid is invalid",
      });
    }

    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { fid, route: "user" },
    });
    if (data) {
      return res.json({
        result: { user: data.user },
        source: "v1",
      });
    }

    data = await getUser({
      token:
        req.headers["WARPCAST_TOKEN"] ||
        process.env.FARQUEST_FARCASTER_APP_TOKEN,
      fid,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { fid, route: "user" },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { user: data.user },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.get("/v1/user", limiter, v1GetUser);

app.get("/v2/user", limiter, async (req, res) => {
  try {
    const fid = req.query.fid;

    if (!fid) {
      return res.status(400).json({
        error: "fid is invalid",
      });
    }

    const user = await getFarcasterUserByFid(fid);

    return res.json({
      result: { user },
      source: "v2",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

const v1UserByUsername = async (req, res) => {
  try {
    const username = req.query.username;

    if (!username) {
      return res.status(400).json({
        error: "username is invalid",
      });
    }

    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { username, route: "user-by-username" },
    });
    if (data) {
      return res.json({
        result: { user: data.user },
        source: "v1",
      });
    }

    data = await getUserByUsername({
      token:
        req.headers["WARPCAST_TOKEN"] ||
        process.env.FARQUEST_FARCASTER_APP_TOKEN,
      username,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { username, route: "user-by-username" },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { user: data.user },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.get("/v1/user-by-username", limiter, v1UserByUsername);

app.get("/v2/user-by-username", limiter, async (req, res) => {
  try {
    const username = req.query.username;

    if (!username) {
      return res.status(400).json({
        error: "username is invalid",
      });
    }

    const user = await getFarcasterUserByUsername(username);

    return res.json({
      result: { user },
      source: "v2",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

const v1MentionAndReplyNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 100);
    const cursor = req.query.cursor || null;
    let data = null;

    // let data = await CacheService.get({
    //   key: `${FARCASTER_KEY}`,
    //   params: { limit, cursor, route: "mention-and-reply-notifications" },
    // });
    // if (data) {
    //   return res.json({
    //     result: { notifications: data.notifications, next: data.next },
    //     source: "v1",
    //   });
    // }
    let token = req.headers["WARPCAST_TOKEN"];
    if (!token && process.env.NODE_ENV !== "production") {
      token = process.env.FARQUEST_FARCASTER_APP_TOKEN;
    }

    if (WARPCAST_SIGNIN_READY) {
      data = await getMentionAndReplyNotifications({
        token,
        limit,
        cursor,
      });
    } else {
      data = {
        notifications: [],
        next: null,
      };
    }

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { limit, cursor, route: "mention-and-reply-notifications" },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { notifications: data.notifications, next: data.next },
      source: "v1",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.get(
  "/v1/mention-and-reply-notifications",
  limiter,
  v1MentionAndReplyNotifications
);

const v1PostMessage = async (req, res) => {
  try {
    const hubClient = getSSLHubRpcClient(process.env.HUB_ADDRESS);
    const isExternal = req.body.isExternal || false;
    const message = MessageFarcaster.fromJSON(req.body.message);
    if (!isExternal) {
      const hubResult = await hubClient.submitMessage(message);
      const unwrapped = hubResult.unwrapOr(null);
      if (!unwrapped) {
        res.status(400).json({ message: "Could not send message" });
        return;
      }
    } else {
      const now = new Date();
      let messageData = {
        fid: message.data.fid,
        createdAt: now,
        updatedAt: now,
        messageType: message.data.type,
        timestamp: farcasterTimeToDate(message.data.timestamp),
        hash: bytesToHex(message.hash),
        hashScheme: message.hashScheme,
        signature: bytesToHex(message.signature),
        signatureScheme: message.signatureScheme,
        signer: bytesToHex(message.signer),
        raw: bytesToHex(MessageFarcaster.encode(message).finish()),
        deletedAt: operation === "delete" ? now : null,
        prunedAt: operation === "prune" ? now : null,
        revokedAt: operation === "revoke" ? now : null,
        external: true,
        unindexed: true,
      };

      await Messages.create(messageData);
    }
    return res.json({ result: MessageFarcaster.toJSON(message) });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.post("/v1/message", authRequired, v1PostMessage);

module.exports = {
  router: app,
};
