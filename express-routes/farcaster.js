const app = require("express").Router();
const Sentry = require("@sentry/node");
const { ethers } = require("ethers");

const rateLimit = require("express-rate-limit");
const { Service: _CacheService } = require("../services/cache/CacheService");
const {
  Service: _FarcasterHubService,
} = require("../services/identities/FarcasterHubService");
const { Service: _AlchemyService } = require("../services/AlchemyService");
const { Account } = require("../models/Account");
const axios = require("axios").default;
const { prod } = require("../helpers/registrar");
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
  getFidByCustodyAddress,
  getFarcasterUnseenNotificationsCount,
  getFarcasterNotifications,
  getFarcasterUserAndLinksByFid,
  getFarcasterUserAndLinksByUsername,
  postMessage,
  searchFarcasterUserByMatch,
} = require("../helpers/farcaster");

const { getSSLHubRpcClient } = require("@farcaster/hub-nodejs");
const { requireAuth } = require("../helpers/auth-middleware");
const { getMemcachedClient } = require("../connectmemcached");

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 3_000, // 3s
  max: 50, // limit each IP to 50 requests per windowMs
  message: "Too many requests, please try again later.",
});

let _hubClient;

const authContext = async (req, res, next) => {
  const hubClient = _hubClient || getSSLHubRpcClient(process.env.HUB_ADDRESS);
  _hubClient = hubClient;

  try {
    if (req.context && req.context.accountId && req.context.hubClient) {
      return next();
    }
    const FCHubService = new _FarcasterHubService();

    const data = await requireAuth(req.headers.authorization?.slice(7) || "");
    if (!data.payload.id) {
      throw new Error("jwt must be provided");
    }
    const account = await Account.findById(data.payload.id);
    if (!account) {
      throw new Error(`Account id ${data.payload.id} not found`);
    }
    const fid = await FCHubService.getFidByAccount(account);
    req.context = {
      ...(req.context || {}),
      accountId: data.payload.id,
      fid: fid,
      account,
      hubClient,
    };
  } catch (e) {
    if (!e.message.includes("jwt must be provided")) {
      Sentry.captureException(e);
      console.error(e);
    }
    req.context = {
      ...(req.context || {}),
      accountId: null,
      fid: null,
      account: null,
      hubClient,
    };
  }
  next();
};

app.get("/v2/feed", [authContext, limiter], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 20);
    const cursor = req.query.cursor || null;
    const trending = req.query.trending || false;

    let [casts, next] = await getFarcasterFeed({
      limit,
      cursor,
      context: req.context,
      trending,
    });

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

app.get("/v2/cast", [authContext, limiter], async (req, res) => {
  try {
    let hash = req.query.hash;
    if (!hash) {
      return res.status(400).json({
        error: "Missing hash",
      });
    }

    const cast = await getFarcasterCastByHash(hash, req.context);

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

app.get("/v2/cast-short", [authContext, limiter], async (req, res) => {
  try {
    let shortHash = req.query.shortHash;
    let username = req.query.username;
    if (!shortHash || !username) {
      return res.status(400).json({
        error: "Missing hash or username",
      });
    }

    const cast = await getFarcasterCastByShortHash(
      shortHash,
      username,
      req.context
    );

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

app.get("/v2/all-casts-in-thread", [authContext, limiter], async (req, res) => {
  try {
    let threadHash = req.query.threadHash;
    if (!threadHash) {
      return res.status(400).json({
        error: "Missing threadHash",
      });
    }

    const casts = await getFarcasterAllCastsInThread(threadHash, req.context);

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

app.get("/v2/casts", [authContext, limiter], async (req, res) => {
  try {
    const fid = req.query.fid;
    const parentChain = req.query.parentChain;
    const limit = Math.min(req.query.limit || 10, 100);
    const cursor = req.query.cursor || null;

    if (!fid && !parentChain) {
      return res.status(400).json({
        error: "fid or parentChain is invalid",
      });
    }

    let [casts, next] = await getFarcasterCasts({
      fid,
      parentChain,
      limit,
      cursor,
      context: req.context,
    });

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

app.get("/v2/user", [limiter, authContext], async (req, res) => {
  try {
    const fid = req.query.fid;

    if (!fid) {
      return res.status(400).json({
        error: "fid is invalid",
      });
    }

    const user = await getFarcasterUserAndLinksByFid({
      fid,
      context: req.context,
    });

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

app.get("/v2/user-by-username", [limiter, authContext], async (req, res) => {
  try {
    const username = req.query.username;

    if (!username) {
      return res.status(400).json({
        error: "username is invalid",
      });
    }

    const user = await getFarcasterUserAndLinksByUsername({
      username,
      context: req.context,
    });

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

app.get(
  "/v2/unseen-notifications-count",
  [authContext, limiter],
  async (req, res) => {
    try {
      if (!req.context.accountId) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }
      const CacheService = new _CacheService();
      let lastSeen = await CacheService.get({
        key: `UNSEEN_NOTIFICATIONS_COUNT`,
        params: {
          accountId: req.context.accountId,
        },
      });
      if (!lastSeen) {
        lastSeen = new Date(0);
      }
      const unseenCount = await getFarcasterUnseenNotificationsCount({
        lastSeen,
        context: req.context,
      });

      return res.json({
        result: { unseenCount },
        source: "v2",
      });
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      return res.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

app.post("/v2/notifications/seen", [authContext, limiter], async (req, res) => {
  try {
    if (!req.context.accountId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const CacheService = new _CacheService();
    const memcached = getMemcachedClient();
    await CacheService.set({
      key: `UNSEEN_NOTIFICATIONS_COUNT`,
      params: {
        accountId: req.context.accountId,
      },
      value: new Date(),
      expiresAt: null,
    });

    try {
      await memcached.delete(
        `getFarcasterUnseenNotificationsCount:${req.context.fid}`,
        { noreply: true }
      );
    } catch (e) {
      console.error(e);
    }

    return res.json({
      result: { success: true },
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

app.get("/v2/notifications", [authContext, limiter], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 100);
    const cursor = req.query.cursor || null;
    let [notifications, next] = await getFarcasterNotifications({
      limit,
      cursor,
      context: req.context,
    });
    return res.json({
      result: { notifications: notifications, next: next },
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

const v2PostMessage = async (req, res) => {
  try {
    const result = await postMessage({
      isExternal: req.body.isExternal || false,
      externalFid: req.context.fid,
      messageJSON: req.body.message,
      hubClient: req.context.hubClient,
      shouldClearCache:
        process.env.NODE_ENV !== "production" && process.env.CLEAR_CACHE,
      memcachedClient: getMemcachedClient(),
      errorHandler: (error) => {
        Sentry.captureException(error);
        console.error(error);
      },
      bodyOverrides: req.body.bodyOverrides,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const v2SignedKeyRequest = async (req, res) => {
  try {
    const key = "0x" + req.query.key;
    const SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN = {
      name: "Farcaster SignedKeyRequestValidator",
      version: "1",
      chainId: 10,
      verifyingContract: "0x00000000fc700472606ed4fa22623acf62c60553",
    };

    const SIGNED_KEY_REQUEST_TYPE = [
      { name: "requestFid", type: "uint256" },
      { name: "key", type: "bytes" },
      { name: "deadline", type: "uint256" },
    ];
    const deadline = Math.floor(Date.now() / 1000) + 86400; // signature is valid for 1 day
    const wallet = ethers.Wallet.fromMnemonic(process.env.FARCAST_KEY);
    const signature = await wallet._signTypedData(
      SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
      { SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE },
      {
        requestFid: ethers.BigNumber.from(18548),
        key,
        deadline: ethers.BigNumber.from(deadline),
      }
    );

    const { data } = await axios.post(
      `https://api.warpcast.com/v2/signed-key-requests`,
      {
        requestFid: "18548",
        deadline: deadline,
        key,
        signature,
      }
    );

    return res.json({ result: data.result, source: "v2" });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

app.post("/v2/message", authContext, v2PostMessage);

app.get("/v2/signed-key-requests", limiter, v2SignedKeyRequest);

app.get("/v2/search-user-by-match", limiter, async (req, res) => {
  try {
    const match = req.query.match;
    const limit = Math.min(parseInt(req.query.limit || 10), 50);

    if (!match) {
      return res.status(400).json({
        error: "match is invalid",
      });
    }

    const users = await searchFarcasterUserByMatch(match, limit);

    return res.json({
      result: { users },
      source: "v2",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/v2/get-address-passes", limiter, async (req, res) => {
  try {
    const address = req.query.address;

    if (!address) {
      return res.status(400).json({
        error: "address is invalid",
      });
    }

    const memcached = getMemcachedClient();

    try {
      const data = await memcached.get(`getAddressPasses:${address}`);
      if (data) {
        return res.json({
          result: { passes: JSON.parse(data.value) },
          source: "v2",
        });
      }
    } catch (e) {
      console.error(e);
    }

    const AlchemyService = new _AlchemyService({
      apiKey: prod().NODE_URL, // force use prod for BEB collection
      chain: prod().NODE_NETWORK, // force use prod for BEB collection
    });

    let isHolder = null;

    try {
      const data = await memcached.get(`getAddressPasses_isHolder:${address}`);
      if (data) {
        isHolder = data.value;
      }
    } catch (e) {
      console.error(e);
    }
    if (isHolder === null) {
      isHolder = await AlchemyService.isHolderOfCollection({
        wallet: address,
        contractAddress: prod().REGISTRAR_ADDRESS,
      });
      try {
        await memcached.set(
          `getAddressPasses_isHolder:${address}`,
          JSON.stringify(isHolder),
          {
            lifetime: isHolder ? 60 * 60 * 24 : 10, // 1 day cache if holder, 10s cache if not
          }
        );
      } catch (e) {
        console.error(e);
      }
    }

    let passes;
    if (isHolder) {
      const data = await AlchemyService.getNFTs({
        owner: address,
        contractAddresses: [prod().REGISTRAR_ADDRESS],
      });
      passes = (data["ownedNfts"] || [])
        .map((nft) => {
          return nft["title"];
        })
        .filter(Boolean);
    } else {
      passes = []; // can shortcut
    }

    try {
      await memcached.set(
        `getAddressPasses:${address}`,
        JSON.stringify(passes),
        {
          lifetime: 60, // 60s cache
        }
      );
    } catch (e) {
      console.error(e);
    }

    return res.json({
      result: { passes },
      source: "v2",
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = {
  router: app,
};
