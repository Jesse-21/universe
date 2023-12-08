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
const { ApiKey } = require("../models/ApiKey");
const axios = require("axios").default;
const { prod } = require("../helpers/registrar");
const {
  Service: _MarketplaceService,
} = require("../services/MarketplaceService");
const {
  getFarcasterUserByFid,
  getFarcasterUserByUsername,
  getFarcasterUserByCustodyAddress,
  getFarcasterUserByConnectedAddress,
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
  getFarcasterStorageByFid,
} = require("../helpers/farcaster");

const {
  getInsecureHubRpcClient,
  getSSLHubRpcClient,
} = require("@farcaster/hub-nodejs");
const { requireAuth } = require("../helpers/auth-middleware");
const { getMemcachedClient, getHash } = require("../connectmemcached");

const apiKeyCache = new Map(); // two layers of cache, in memory and memcached

const getLimit = (baseMultiplier) => {
  // query ApiKeys to get the multiplier and return the multiplier * baseMultiplier or 0
  return async (req, _res) => {
    const key = req.header("API-KEY");
    if (!key) {
      const err = `Missing API-KEY header! Returning 0 for ${req.url}`;
      Sentry.captureMessage(err);
      return 0;
    }
    const memcached = getMemcachedClient();
    let apiKey;

    if (apiKeyCache.has(key)) {
      apiKey = apiKeyCache.get(key);
    } else {
      try {
        const data = await memcached.get(
          getHash(`FarcasterApiKey_getLimit:${key}`)
        );
        if (data) {
          apiKey = new ApiKey(JSON.parse(data.value));
          apiKeyCache.set(key, apiKey);
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (!apiKey) {
      apiKey = await ApiKey.findOne({ key });
      if (apiKey) {
        apiKeyCache.set(key, apiKey);
        try {
          await memcached.set(
            getHash(`FarcasterApiKey_getLimit:${key}`),
            JSON.stringify(apiKey),
            { lifetime: 60 * 60 } // 1 hour
          );
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (!apiKey) {
      const err = `API-KEY ${key} not found! Returning 0 for ${req.url}`;
      console.error(err);
      Sentry.captureMessage(err);
      return 0;
    }

    return Math.ceil(baseMultiplier * apiKey.multiplier);
  };
};

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 3_000,
  max: getLimit(2.5),
  message:
    "Too many requests or invalid API key! See docs.wield.co for more info.",
  validate: { limit: false },
});
const heavyLimiter = rateLimit({
  windowMs: 2_000,
  max: getLimit(0.3),
  message:
    "Too many requests or invalid API key! See docs.wield.co for more info.",
  validate: { limit: false },
});

let _hubClient;

const authContext = async (req, res, next) => {
  const hubClient =
    _hubClient ||
    (process.env.HUB_SECURE === "SECURE"
      ? getSSLHubRpcClient(process.env.HUB_ADDRESS)
      : getInsecureHubRpcClient(process.env.HUB_ADDRESS));
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
    const fid = await FCHubService.getFidByAccount(
      account,
      data.payload.isExternal
    );
    req.context = {
      ...(req.context || {}),
      accountId: data.payload.id,
      fid: fid,
      account,
      hubClient,
    };
  } catch (e) {
    if (
      !e.message.includes("jwt must be provided") &&
      !e.message.includes("jwt malformed")
    ) {
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
    const explore = req.query.explore === "true";

    let [casts, next] = await getFarcasterFeed({
      limit,
      cursor,
      context: req.context,
      explore,
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
    const filters = JSON.parse(req.query.filters || null);
    const parentChain = req.query.parentChain;
    const limit = Math.min(req.query.limit || 10, 100);
    const cursor = req.query.cursor || null;
    const explore = req.query.explore === "true";

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
      explore,
      filters,
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

app.get("/v2/user-by-custody-address", [limiter], async (req, res) => {
  try {
    const address = (req.query.address || "").toLowerCase();

    if (!address || address.length < 10) {
      return res.status(400).json({
        error: "address is invalid",
      });
    }

    const user = await getFarcasterUserByCustodyAddress(address);

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

app.get("/v2/user-by-connected-address", [limiter], async (req, res) => {
  try {
    const address = (req.query.address || "").toLowerCase();

    if (!address || address.length < 10) {
      return res.status(400).json({
        error: "address is invalid",
      });
    }

    const user = await getFarcasterUserByConnectedAddress(address);

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
        lastSeen = new Date();
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
  const externalFid = req.context.fid;
  try {
    const result = await postMessage({
      isExternal: req.body.isExternal || externalFid.startsWith("0x") || false,
      externalFid,
      messageJSON: req.body.message,
      hubClient: req.context.hubClient,
      errorHandler: (error) => {
        Sentry.captureException(error);
        console.error(error);
      },
      bodyOverrides: req.body.bodyOverrides,
    });
    res.json(result);
  } catch (error) {
    Sentry.captureException(error);
    console.error(error);
    let e = "Internal Server Error";
    if (error?.message?.includes("no storage")) {
      e = "No active storage for this FID, buy a storage unit at far.quest!";
    }
    res.status(500).json({ error: e });
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

app.post("/v2/message", [heavyLimiter, authContext], v2PostMessage);

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
    const address = (req.query.address || "").toLowerCase();

    if (!address || address.length < 10) {
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
    const OptimismAlchemyService = new _AlchemyService({
      apiKey: prod().OPTIMISM_NODE_URL, // force use prod for OP BEB collection
      chain: prod().OPTIMISM_NODE_NETWORK, // force use prod for OP BEB collection
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
      isHolder ||= await OptimismAlchemyService.isHolderOfCollection({
        wallet: address,
        contractAddress: prod().OPTIMISM_REGISTRAR_ADDRESS,
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
      const [data, optimismData] = await Promise.all([
        AlchemyService.getNFTs({
          owner: address,
          contractAddresses: [prod().REGISTRAR_ADDRESS],
        }),
        OptimismAlchemyService.getNFTs({
          owner: address,
          contractAddresses: [prod().OPTIMISM_REGISTRAR_ADDRESS],
        }),
      ]);
      passes = (data?.ownedNfts || [])
        .concat(optimismData?.ownedNfts || [])
        .map((nft) => {
          let title = nft["title"];
          // Lets set passes as .cast
          title = title
            ? `${title.replace(".beb", "").replace(".cast", "")}.cast`
            : null;
          return title;
        })
        .filter((title) => {
          return title && !title.includes("no_metadata");
        });
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

app.get("/v2/get-farcaster-storage", limiter, async (req, res) => {
  const data = await getFarcasterStorageByFid(req.query.fid);

  return res.json({ result: { data } });
});

const completeMarketplaceV1Listing = async (req, res) => {
  try {
    const MarketplaceService = new _MarketplaceService();
    const newListing = await MarketplaceService.list(req.body);
    res.json({ result: { listing: newListing }, success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

const buyMarketplaceV1Listing = async (req, res) => {
  try {
    const MarketplaceService = new _MarketplaceService();
    const newListing = await MarketplaceService.buy(req.body);
    return res.json({ success: true, result: { listing: newListing } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

const cancelMarketplaceV1Listing = async (req, res) => {
  try {
    const MarketplaceService = new _MarketplaceService();
    const newListing = await MarketplaceService.cancelListing(req.body);
    return res.json({ success: true, result: { listing: newListing } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

const completeMarketplaceV1Offer = async (req, res) => {
  try {
    const MarketplaceService = new _MarketplaceService();
    const newOffer = await MarketplaceService.offer(req.body);
    res.json({ result: { offer: newOffer }, success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

const cancelMarketplaceV1Offer = async (req, res) => {
  try {
    const MarketplaceService = new _MarketplaceService();
    const newOffer = await MarketplaceService.cancelOffer(req.body);
    res.json({ result: { offer: newOffer }, success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

const approveMarketplaceV1Offer = async (req, res) => {
  try {
    const MarketplaceService = new _MarketplaceService();
    const newOffer = await MarketplaceService.approveOffer(req.body);
    res.json({ result: { offer: newOffer }, success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

const getMarketplaceV1Listings = async (req, res) => {
  try {
    const MarketplaceService = new _MarketplaceService();
    const [listings, next] = await MarketplaceService.getListings({
      ...req.query,
      filters: JSON.parse(req.query.filters || "{}"),
    });
    return res.json({ listings: listings, next });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

const getMarketplaceV1Listing = async (req, res) => {
  try {
    const MarketplaceService = new _MarketplaceService();
    const listing = await MarketplaceService.getListing(req.query);
    return res.json({ listing });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

const getMarketplaceV1Stats = async (req, res) => {
  try {
    const MarketplaceService = new _MarketplaceService();
    const { stats, success } = await MarketplaceService.getStats();
    return res.json({ stats, success });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

const getMarketplaceV1Activities = async (req, res) => {
  try {
    const MarketplaceService = new _MarketplaceService();
    const [activities, next] = await MarketplaceService.getActivities(
      req.query
    );
    return res.json({ result: { activities, next } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

const getMarketplaceV1Offers = async (req, res) => {
  try {
    const MarketplaceService = new _MarketplaceService();
    const offers = await MarketplaceService.getOffers(req.query);
    return res.json({ result: { offers } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

const getMarketplaceV1Offer = async (req, res) => {
  try {
    const MarketplaceService = new _MarketplaceService();
    const offer = await MarketplaceService.getOffer(req.query);
    return res.json({ result: { offer } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

const getMarketplaceV1BestOffer = async (req, res) => {
  try {
    const MarketplaceService = new _MarketplaceService();
    const offer = await MarketplaceService.getBestOffer(req.query);
    return res.json({ result: { offer } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

app.post(
  "/v2/marketplace/listings/complete",
  [heavyLimiter],
  completeMarketplaceV1Listing
);

app.get("/v2/marketplace/listings", [limiter], getMarketplaceV1Listings);
app.get("/v2/marketplace/stats", [limiter], getMarketplaceV1Stats);
app.get("/v2/marketplace/listing", [limiter], getMarketplaceV1Listing);
app.get("/v2/marketplace/activities", [limiter], getMarketplaceV1Activities);
app.get("/v2/marketplace/offers", [limiter], getMarketplaceV1Offers);
app.get("/v2/marketplace/offer", [limiter], getMarketplaceV1Offer);
app.get("/v2/marketplace/best-offer", [limiter], getMarketplaceV1BestOffer);

app.post(
  "/v2/marketplace/listings/buy",
  [heavyLimiter],
  buyMarketplaceV1Listing
);

app.post(
  "/v2/marketplace/listings/cancel",
  [heavyLimiter],
  cancelMarketplaceV1Listing
);

app.post(
  "/v2/marketplace/offers/complete",
  [heavyLimiter],
  completeMarketplaceV1Offer
);

app.post(
  "/v2/marketplace/offers/cancel",
  [heavyLimiter],
  cancelMarketplaceV1Offer
);

app.post(
  "/v2/marketplace/offers/accept",
  [heavyLimiter],
  approveMarketplaceV1Offer
);

module.exports = {
  router: app,
};
