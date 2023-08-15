const app = require("express").Router();
const Sentry = require("@sentry/node");

const rateLimit = require("express-rate-limit");
const { Service: _CacheService } = require("../services/cache/CacheService");

const {
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
  deleteRecasts,
  putRecasts,
  getFollowers,
  putFollowing,
  deleteFollowing,
  getFollowing,
  getUser,
  getUserByUsername,
  getMentionAndReplyNotifications,
} = require("../helpers/warpcast");

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 3_000, // 3s
  max: 50, // limit each IP to 50 requests per windowMs
  message: "Too many requests, please try again later.",
});

const CacheService = new _CacheService();

const FARCASTER_KEY = "farcaster-express-endpoint";

const WARPCAST_SIGNIN_READY = false; // We need warpcast signin since we are using @farquest

app.get("/v1/feed", limiter, async (req, res) => {
  try {
    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { route: "feed" },
    });
    if (data) {
      return res.json({
        result: { casts: data.casts },
      });
    }

    data = await getAllRecentCasts({
      token:
        req.headers["WARPCAST_TOKEN"] ||
        process.env.FARQUEST_FARCASTER_APP_TOKEN,
      limit: 250,
    });

    await CacheService.set({
      key: `${FARCASTER_KEY}`,
      params: { route: "feed" },
      value: data,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { casts: data.casts },
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.get("/v1/cast", limiter, async (req, res) => {
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.get("/v1/casts", limiter, async (req, res) => {
  try {
    const fid = req.query.fid;
    const limit = req.query.limit || 10;
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
      expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minute cache
    });

    return res.json({
      result: { casts: data.casts, next: data.next },
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.post("/v1/casts", limiter, async (req, res) => {
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
      cast = data.cast;
    }

    return res.json({
      result: { cast },
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.delete("/v1/casts", limiter, async (req, res) => {
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.get("/v1/cast-reactions", limiter, async (req, res) => {
  try {
    const castHash = req.query.castHash;
    const limit = req.query.limit || 100;
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.get("/v1/cast-likes", limiter, async (req, res) => {
  try {
    const castHash = req.query.castHash;
    const limit = req.query.limit || 100;
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.put("/v1/cast-likes", limiter, async (req, res) => {
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.delete("/v1/cast-likes", limiter, async (req, res) => {
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.get("/v1/cast-likes", limiter, async (req, res) => {
  try {
    const castHash = req.query.castHash;
    const limit = req.query.limit || 100;
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.put("/v1/cast-likes", limiter, async (req, res) => {
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.delete("/v1/cast-likes", limiter, async (req, res) => {
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.get("/v1/cast-recasters", limiter, async (req, res) => {
  try {
    const castHash = req.query.castHash;
    const limit = req.query.limit || 100;
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.put("/v1/recasts", limiter, async (req, res) => {
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.delete("/v1/recasts", limiter, async (req, res) => {
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.get("/v1/followers", limiter, async (req, res) => {
  try {
    const fid = req.query.fid;
    const limit = req.query.limit || 100;
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.put("/v1/following", limiter, async (req, res) => {
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.delete("/v1/following", limiter, async (req, res) => {
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.get("/v1/following", limiter, async (req, res) => {
  try {
    const fid = req.query.fid;
    const limit = req.query.limit || 100;
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.get("/v1/user", limiter, async (req, res) => {
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.get("/v1/user-by-username", limiter, async (req, res) => {
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.get("/v1/mention-and-reply-notifications", limiter, async (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const cursor = req.query.cursor || null;

    let data = await CacheService.get({
      key: `${FARCASTER_KEY}`,
      params: { limit, cursor, route: "mention-and-reply-notifications" },
    });
    if (data) {
      return res.json({
        result: { notifications: data.notifications, next: data.next },
      });
    }

    if (WARPCAST_SIGNIN_READY) {
      data = await getMentionAndReplyNotifications({
        token: req.headers["WARPCAST_TOKEN"],
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
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

module.exports = {
  router: app,
};
