const {
  Messages,
  Casts,
  Reactions,
  Signers,
  Verifications,
  UserData,
  Fids,
  Fnames,
  Links,
  UserDataType,
  ReactionType,
  Notifications,
} = require("../models/farcaster");

const { getMemcachedClient } = require("../connectmemcached");
const { Message, fromFarcasterTime } = require("@farcaster/hub-nodejs");

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

const postMessage = async ({
  isExternal = false,
  externalFid,
  messageJSON,
  hubClient,
  shouldClearCache = false,
  memcachedClient,
  errorHandler = (error) => console.error(error),
}) => {
  try {
    let message = Message.fromJSON(messageJSON);

    if (!isExternal) {
      const hubResult = await hubClient.submitMessage(message);
      const unwrapped = hubResult.unwrapOr(null);
      if (!unwrapped) {
        throw new Error("Could not send message");
      } else {
        message = {
          ...unwrapped,
          hash: unwrapped.hash,
          signer: unwrapped.signer,
        };
      }
    }

    const now = new Date();
    let messageData = {
      fid: isExternal ? externalFid : message.data.fid,
      createdAt: now,
      updatedAt: now,
      messageType: message.data.type,
      timestamp: farcasterTimeToDate(message.data.timestamp),
      hash: bytesToHex(message.hash),
      hashScheme: message.hashScheme,
      signature: bytesToHex(message.signature),
      signatureScheme: message.signatureScheme,
      signer: bytesToHex(message.signer),
      raw: bytesToHex(Message.encode(message).finish()),
      external: isExternal,
      unindexed: true,
    };

    await Messages.create(messageData);

    if (shouldClearCache) {
      await memcachedClient.cmd("flush_all", { noreply: true });
      console.log("Cleared memcached due to CLEAR_CACHE");
    }

    return { result: messageData, source: "v2" };
  } catch (e) {
    errorHandler(e);
    throw e; // Re-throw to let the caller handle it further if needed
  }
};

const createOrFindExternalFarcasterUser = async (address) => {
  if (!address) return null;
  const existing = await Fids.findOne({ fid: address, deletedAt: null });
  if (existing) return await getFarcasterUserByFid(existing.fid);
  const newFid = await Fids.create({
    fid: address,
    external: true,
    custodyAddress: address,
    deletedAt: null,
  });
  return await getFarcasterUserByFid(newFid.fid);
};

const getFarcasterUserByFid = async (fid) => {
  const memcached = getMemcachedClient();
  try {
    const data = await memcached.get(`getFarcasterUserByFid:${fid}`);
    if (data) {
      return JSON.parse(data.value);
    }
  } catch (e) {
    console.error(e);
  }
  if (!fid) return null;
  const [following, followers, allUserData, fids] = await Promise.all([
    Links.countDocuments({ fid, type: "follow", deletedAt: null }),
    Links.countDocuments({
      targetFid: fid,
      type: "follow",
      deletedAt: null,
    }),
    UserData.find({ fid, deletedAt: null }).sort({ createdAt: 1 }),
    Fids.findOne({ fid, deletedAt: null }),
  ]);

  let user = {
    fid,
    followingCount: following,
    followerCount: followers,
    pfp: {
      url: "",
      verified: false,
    },
    bio: {
      text: "",
      mentions: [],
    },
    external: false,
    custodyAddress: fids?.custodyAddress,
  };

  let registeredAt = null;
  for (const userData of allUserData) {
    if (userData.external) user.external = true;
    registeredAt = registeredAt || userData.createdAt;
    // determine if userData.createdAt is earlier than registeredAt
    if (userData.createdAt < registeredAt) {
      registeredAt = userData.createdAt;
    }
    const hexString = userData.value.startsWith("0x")
      ? userData.value.slice(2)
      : userData.value;
    const found = {};

    const convertedData = Buffer.from(hexString, "hex").toString("utf8");
    switch (userData.type) {
      case UserDataType.USER_DATA_TYPE_USERNAME:
        if (!found.username) {
          user.username = convertedData;
          found.username = true;
        }
        break;
      case UserDataType.USER_DATA_TYPE_DISPLAY:
        if (!found.displayName) {
          user.displayName = convertedData;
          found.displayName = true;
        }
        break;
      case UserDataType.USER_DATA_TYPE_PFP:
        if (!found.pfp) {
          user.pfp.url = convertedData;
          found.pfp = true;
        }
        break;
      case UserDataType.USER_DATA_TYPE_BIO:
        if (!found.bio) {
          user.bio.text = convertedData;
          // find "@" mentions not inside a link
          const mentionRegex = /(?<!\]\()@([a-zA-Z0-9_]+)/g;
          let match;
          while ((match = mentionRegex.exec(convertedData))) {
            user.bio.mentions.push(match[1]);
          }
          found.bio = true;
        }
        break;
      case UserDataType.USER_DATA_TYPE_URL:
        if (!found.url) {
          user.url = convertedData;
          found.url = true;
        }
        break;
    }
  }

  user.registeredAt = registeredAt?.getTime();

  try {
    await memcached.set(`getFarcasterUserByFid:${fid}`, JSON.stringify(user));
  } catch (e) {
    console.error(e);
  }

  return user;
};

const getFarcasterUserAndLinksByFid = async ({ fid, context }) => {
  const user = await getFarcasterUserByFid(fid);
  if (!context.fid || fid === context.fid) return user;
  if (!user) return null;

  const memcached = getMemcachedClient();

  let links;

  try {
    const data = await memcached.get(
      `getFarcasterUserAndLinksByFid_${context.fid}:${fid}`
    );
    if (data) {
      links = JSON.parse(data.value);
    }
  } catch (e) {
    console.error(e);
  }

  if (!links) {
    const [isFollowing, isFollowedBy] = await Promise.all([
      Links.exists({
        fid: context.fid,
        targetFid: fid,
        type: "follow",
        deletedAt: null,
      }),
      Links.exists({
        fid,
        targetFid: context.fid,
        type: "follow",
        deletedAt: null,
      }),
    ]);
    links = {
      isFollowing,
      isFollowedBy,
    };
    try {
      await memcached.set(
        `getFarcasterUserAndLinksByFid_${context.fid}:${fid}`,
        JSON.stringify(links)
      );
    } catch (e) {
      console.error(e);
    }
  }
  return {
    ...user,
    ...links,
  };
};

const getFarcasterUserByCustodyAddress = async (custodyAddress) => {
  if (!custodyAddress) return null;
  const fid = await Fids.findOne({ custodyAddress, deletedAt: null });
  if (!fid) return null;

  return await getFarcasterUserByFid(fid.fid);
};

const getFarcasterUserByConnectedAddress = async (connectedAddress) => {
  // Verifications.claim is similar to {"address":"0x86924c37a93734e8611eb081238928a9d18a63c0","ethSignature":"0x2fc09da1f4dcb7236efb91f77932c249c418c0af00c66ed92ee1f35b02c80d6a1145280c9f361d207d28447f8f7463366840d3a9369036cf6954afd1fd331beb1b","blockHash":"0x191905a9201170abb55f4c90a4cc968b44c1b71cdf3db2764b775c93e7e22b29"}
  // We need to find "address":"connectedAddress"
  const memcached = getMemcachedClient();
  let fid;
  try {
    const data = await memcached.get(
      `getFarcasterUserByConnectedAddress_fid:${connectedAddress}`
    );
    if (data) {
      fid = data.value;
    }
  } catch (e) {
    console.error(e);
  }

  if (!fid) {
    const pattern = '^\\{"address":"' + connectedAddress.toLowerCase() + '"';

    const verification = await Verifications.findOne({
      claim: { $regex: pattern },
      deletedAt: null,
    });

    if (!verification) return null;

    fid = verification.fid;
  }

  try {
    await memcached.set(
      `getFarcasterUserByConnectedAddress_fid:${connectedAddress}`,
      fid
    );
  } catch (e) {
    console.error(e);
  }

  return await getFarcasterUserByFid(fid);
};

const getConnectedAddressForFid = async (fid) => {
  if (!fid) return null;
  const memcached = getMemcachedClient();
  try {
    const data = await memcached.get(`getConnectedAddressForFid:${fid}`);
    if (data) {
      return data.value;
    }
  } catch (e) {
    console.error(e);
  }
  const verification = await Verifications.findOne({
    fid,
    deletedAt: null,
  });

  if (!verification) return null;

  // need to JSON parse the claim

  const claim = JSON.parse(verification.claim);

  try {
    await memcached.set(
      `getConnectedAddressForFid:${fid}`,
      claim.address.toLowerCase()
    );
  } catch (e) {
    console.error(e);
  }

  return claim.address;
};

const getFidByCustodyAddress = async (custodyAddress) => {
  if (!custodyAddress) return null;
  const memcached = getMemcachedClient();
  try {
    const data = await memcached.get(
      `getFidByCustodyAddress:${custodyAddress}`
    );
    if (data) {
      return data.value;
    }
  } catch (e) {
    console.error(e);
  }
  const fid = await Fids.findOne({ custodyAddress, deletedAt: null });
  if (!fid) return null;

  try {
    await memcached.set(`getFidByCustodyAddress:${custodyAddress}`, fid.fid);
  } catch (e) {
    console.error(e);
  }

  return fid.fid;
};

const searchFarcasterUserByMatch = async (username, limit = 10) => {
  // convert to hex with 0x prefix
  const partialHexUsername =
    "0x" + Buffer.from(username, "ascii").toString("hex");

  const memcached = getMemcachedClient();
  try {
    const data = await memcached.get(`searchFarcasterUserByMatch:${username}`);
    if (data) {
      return JSON.parse(data.value);
    }
  } catch (e) {
    console.error(e);
  }

  const users = await UserData.find({
    $or: [
      {
        value: { $regex: `^${partialHexUsername}` },
        type: UserDataType.USER_DATA_TYPE_USERNAME,
        deletedAt: null,
      },
      {
        value: { $regex: `^${partialHexUsername}` },
        type: UserDataType.USER_DATA_TYPE_DISPLAY,
        deletedAt: null,
      },
    ],
  }).limit(limit);
  const hash = {};

  const fids = users
    .map((user) => {
      if (hash[user.fid]) return null;
      hash[user.fid] = true;
      return user.fid;
    })
    .filter((fid) => fid !== null);

  const farcasterUsers = await Promise.all(
    fids.map((fid) => getFarcasterUserByFid(fid))
  );

  try {
    await memcached.set(
      `searchFarcasterUserByMatch:${username}`,
      JSON.stringify(farcasterUsers),
      {
        lifetime: 60 * 60, // 1 hour cache
      }
    );
  } catch (e) {
    console.error(e);
  }

  return farcasterUsers;
};

const getFarcasterUserByUsername = async (username, links = false) => {
  // convert to hex with 0x prefix
  const hexUsername = "0x" + Buffer.from(username, "ascii").toString("hex");

  let fid;
  const memcached = getMemcachedClient();
  try {
    const data = await memcached.get(
      `getFarcasterUserByUsername_fid:${username}`
    );
    if (data) {
      fid = data.value;
    }
  } catch (e) {
    console.error(e);
  }
  if (!fid) {
    const userData = await UserData.findOne({
      value: hexUsername,
      type: UserDataType.USER_DATA_TYPE_USERNAME,
      deletedAt: null,
    });
    fid = userData?.fid;
  }
  if (fid) {
    try {
      await memcached.set(`getFarcasterUserByUsername_fid:${username}`, fid);
    } catch (e) {
      console.error(e);
    }
    return await getFarcasterUserByFid(fid);
  }
  return null;
};

const getFarcasterUserAndLinksByUsername = async ({ username, context }) => {
  // convert to hex with 0x prefix
  const hexUsername = "0x" + Buffer.from(username, "ascii").toString("hex");

  let fid;
  const memcached = getMemcachedClient();
  try {
    const data = await memcached.get(
      `getFarcasterUserAndLinksByUsername_fid:${username}`
    );
    if (data) {
      fid = data.value;
    }
  } catch (e) {
    console.error(e);
  }
  if (!fid) {
    const userData = await UserData.findOne({
      value: hexUsername,
      type: UserDataType.USER_DATA_TYPE_USERNAME,
      deletedAt: null,
    });
    fid = userData?.fid;
  }
  if (fid) {
    try {
      await memcached.set(
        `getFarcasterUserAndLinksByUsername_fid:${username}`,
        fid
      );
    } catch (e) {
      console.error(e);
    }
    return await getFarcasterUserAndLinksByFid({ fid, context });
  }
  return null;
};

const getFarcasterCastByHash = async (hash, context = {}) => {
  const memcached = getMemcachedClient();

  let contextData;
  let cast;

  if (context.fid) {
    try {
      const data = await memcached.get(
        `getFarcasterCastByHash_${context.fid}:${hash}`
      );
      if (data) {
        contextData = JSON.parse(data.value);
      }
    } catch (e) {
      console.error(e);
    }
    if (!contextData) {
      cast = await Casts.findOne({ hash, deletedAt: null });
      if (!cast) return null;
      const [isSelfLike, isSelfRecast] = await Promise.all([
        Reactions.exists({
          targetHash: cast.hash,
          fid: context.fid,
          reactionType: ReactionType.REACTION_TYPE_LIKE,
          deletedAt: null,
        }),
        Reactions.exists({
          targetHash: cast.hash,
          fid: context.fid,
          reactionType: ReactionType.REACTION_TYPE_RECAST,
          deletedAt: null,
        }),
      ]);
      contextData = {
        isSelfLike,
        isSelfRecast,
      };
      try {
        await memcached.set(
          `getFarcasterCastByHash_${context.fid}:${hash}`,
          JSON.stringify(contextData)
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  try {
    const data = await memcached.get(`getFarcasterCastByHash:${hash}`);
    if (data) {
      return { ...JSON.parse(data.value), ...contextData };
    }
  } catch (e) {
    console.error(e);
  }
  if (!cast) {
    cast = await Casts.findOne({ hash, deletedAt: null });
  }
  if (!cast) return null;

  const [
    repliesCount,
    reactionsCount,
    recastsCount,
    parentAuthor,
    author,
    recastersFids,
  ] = await Promise.all([
    Casts.countDocuments({ parentHash: cast.hash, deletedAt: null }),
    Reactions.countDocuments({
      targetHash: cast.hash,
      reactionType: ReactionType.REACTION_TYPE_LIKE,
      deletedAt: null,
    }),
    Reactions.countDocuments({
      targetHash: cast.hash,
      reactionType: ReactionType.REACTION_TYPE_RECAST,
      deletedAt: null,
    }),
    getFarcasterUserByFid(cast.parentFid),
    getFarcasterUserAndLinksByFid({ fid: cast.fid, context }),
    Reactions.find({
      targetHash: cast.hash,
      reactionType: ReactionType.REACTION_TYPE_RECAST,
      deletedAt: null,
    }).select("fid"),
  ]);

  const mentionPromises = cast.mentions.map((mention) =>
    getFarcasterUserByFid(mention)
  );
  const recastersPromises = recastersFids.map((recaster) =>
    getFarcasterUserByFid(recaster.fid)
  );
  const [mentionUsers, recasters] = await Promise.all([
    Promise.all(mentionPromises),
    Promise.all(recastersPromises),
  ]);

  let text = cast.text;
  let offset = 0;
  let updatedMentionsPositions = []; // Array to store updated positions

  // Convert text to a Buffer object to deal with bytes
  let textBuffer = Buffer.from(text, "utf-8");

  for (let i = 0; i < mentionUsers.length; i++) {
    // Assuming mentionsPositions consider newlines as bytes, so no newline adjustment
    const adjustedMentionPosition = cast.mentionsPositions[i];
    const mentionUsername = mentionUsers[i].username;

    const mentionLink = `@${mentionUsername}`;
    const mentionLinkBuffer = Buffer.from(mentionLink, "utf-8");

    // Assuming originalMention field exists in mentionUsers array
    const originalMention = mentionUsers[i].originalMention || "";
    const originalMentionBuffer = Buffer.from(originalMention, "utf-8");
    const originalMentionLength = originalMentionBuffer.length;

    // Apply the offset only when slicing the text
    const actualPosition = adjustedMentionPosition + offset;

    const beforeMention = textBuffer.slice(0, actualPosition);
    const afterMention = textBuffer.slice(
      actualPosition + originalMentionLength
    );

    // Concatenating buffers
    textBuffer = Buffer.concat([
      beforeMention,
      mentionLinkBuffer,
      afterMention,
    ]);

    // Update the offset based on the added mention
    offset += mentionLinkBuffer.length - originalMentionLength;

    // Store the adjusted position in the new array
    updatedMentionsPositions.push(actualPosition);
  }

  // Convert the final Buffer back to a string
  text = textBuffer.toString("utf-8");

  const data = {
    hash: cast.hash,
    parentHash: cast.parentHash,
    parentFid: cast.parentFid,
    parentUrl: cast.parentUrl,
    threadHash: cast.threadHash,
    text: text,
    embeds: JSON.parse(cast.embeds),
    mentions: mentionUsers,
    mentionsPositions: updatedMentionsPositions,
    external: cast.external,
    author,
    parentAuthor,
    timestamp: cast.timestamp.getTime(),
    replies: {
      count: repliesCount,
    },
    reactions: {
      count: reactionsCount,
    },
    recasts: {
      count: recastsCount,
      recasters: recasters,
    },
    deletedAt: cast.deletedAt,
  };

  try {
    await memcached.set(`getFarcasterCastByHash:${hash}`, JSON.stringify(data));
  } catch (e) {
    console.error(e);
  }

  return { ...data, ...contextData };
};

const getFarcasterFeedCastByHash = async (hash, context = {}) => {
  const cast = await getFarcasterCastByHash(hash, context);
  if (cast.threadHash) {
    // return the root cast with childrenCasts
    const root = await getFarcasterCastByHash(cast.threadHash, context);
    return {
      ...root,
      childCast: cast,
      childrenCasts: [cast],
    };
  }
  return null;
};

const getFarcasterCastByShortHash = async (
  shortHash,
  username,
  context = {}
) => {
  // use username, hash to find cast
  const user = await getFarcasterUserByUsername(username);
  if (!user) return null;

  const memcached = getMemcachedClient();

  let castHash;
  try {
    const data = await memcached.get(
      `getFarcasterCastByShortHash:${shortHash}`
    );
    if (data) {
      castHash = data.value;
    }
  } catch (e) {
    console.error(e);
  }

  if (!castHash) {
    const cast = await Casts.findOne({
      hash: { $regex: `^${shortHash}` },
      fid: user.fid,
      deletedAt: null,
    });
    if (!cast) return null;
    castHash = cast.hash;
  }

  return await getFarcasterCastByHash(castHash, context);
};

const getFarcasterAllCastsInThread = async (threadHash, context) => {
  const memcached = getMemcachedClient();
  let childrenCasts;

  try {
    const data = await memcached.get(
      `getFarcasterAllCastsInThread:${threadHash}`
    );
    if (data) {
      childrenCasts = JSON.parse(data.value).map((cast) => new Casts(cast));
    }
  } catch (e) {
    console.error(e);
  }

  if (!childrenCasts) {
    childrenCasts = await Casts.find({
      threadHash: threadHash,
      deletedAt: null,
    }).sort({ timestamp: -1 });
    try {
      await memcached.set(
        `getFarcasterAllCastsInThread:${threadHash}`,
        JSON.stringify(childrenCasts)
      );
    } catch (e) {
      console.error(e);
    }
  }

  const children = await Promise.all(
    childrenCasts.map((c) => getFarcasterCastByHash(c.hash, context))
  );

  const parentCastData = await getFarcasterCastByHash(threadHash, context);

  return [parentCastData, ...children];
};

const getFarcasterCasts = async ({
  fid,
  parentChain,
  limit,
  cursor,
  context,
}) => {
  const [offset, lastId] = cursor ? cursor.split("-") : [null, null];
  const memcached = getMemcachedClient();

  const query = {
    timestamp: { $lt: offset || Date.now() },
    id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
    deletedAt: null,
  };

  if (fid) {
    query["fid"] = fid;
  } else if (parentChain) {
    query["parentUrl"] = parentChain;
  } else {
    throw new Error("Must provide fid or parentChain");
  }

  let casts;
  if (cursor) {
    try {
      const data = await memcached.get(
        `getFarcasterCasts:${fid}:${parentChain}:${limit}:${cursor}`
      );
      if (data) {
        casts = JSON.parse(data.value).map((cast) => new Casts(cast));
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!casts) {
    casts = await Casts.find(query).sort({ timestamp: -1 }).limit(limit);
    if (cursor) {
      try {
        await memcached.set(
          `getFarcasterCasts:${fid}:${parentChain}:${limit}:${cursor}`,
          JSON.stringify(casts)
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  const castPromises = casts.map((cast) =>
    getFarcasterCastByHash(cast.hash, context)
  );
  const castData = await Promise.all(castPromises);
  const parentHashPromises = castData.map((cast) => {
    if (cast.parentHash) {
      // return the root cast with childrenCasts
      const root = getFarcasterCastByHash(cast.parentHash, context);
      return root;
    } else {
      return cast;
    }
  });
  const parentData = await Promise.all(parentHashPromises);
  const finalData = castData.map((cast, index) => {
    if (cast.parentHash && parentData[index]) {
      return {
        ...parentData[index],
        childCast: cast,
        childrenCasts: [cast],
      };
    } else {
      return cast;
    }
  });

  let next = null;
  if (casts.length === limit) {
    next = `${casts[casts.length - 1].timestamp.getTime()}-${
      casts[casts.length - 1].id
    }`;
  }

  return [finalData, next];
};

const getFarcasterFollowing = async (fid, limit, cursor) => {
  const [offset, lastId] = cursor ? cursor.split("-") : [null, null];
  const memcached = getMemcachedClient();
  let following;
  if (cursor) {
    try {
      const data = await memcached.get(
        `getFarcasterFollowing:${fid}:${limit}:${cursor}`
      );
      if (data) {
        following = JSON.parse(data.value).map((follow) => new Links(follow));
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (!following) {
    following = await Links.find({
      fid,
      type: "follow",
      timestamp: { $lt: offset || Date.now() },
      id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
      deletedAt: null,
    })
      .sort({ timestamp: -1 })
      .limit(limit);
    if (cursor) {
      try {
        await memcached.set(
          `getFarcasterFollowing:${fid}:${limit}:${cursor}`,
          JSON.stringify(following)
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  const followingPromises = following.map((follow) =>
    getFarcasterUserByFid(follow.targetFid)
  );
  const followingData = await Promise.all(followingPromises);

  let next = null;
  if (following.length === limit) {
    next = `${following[following.length - 1].timestamp.getTime()}-${
      following[following.length - 1].id
    }`;
  }

  return [followingData, next];
};

const getFarcasterFollowers = async (fid, limit, cursor) => {
  const [offset, lastId] = cursor ? cursor.split("-") : [null, null];
  const memcached = getMemcachedClient();
  let followers;
  if (cursor) {
    try {
      const data = await memcached.get(
        `getFarcasterFollowers:${fid}:${limit}:${cursor}`
      );
      if (data) {
        followers = JSON.parse(data.value).map(
          (follower) => new Links(follower)
        );
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (!followers) {
    followers = await Links.find({
      targetFid: fid,
      type: "follow",
      timestamp: { $lt: offset || Date.now() },
      id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
      deletedAt: null,
    })
      .sort({ timestamp: -1 })
      .limit(limit);
    if (cursor) {
      try {
        await memcached.set(
          `getFarcasterFollowers:${fid}:${limit}:${cursor}`,
          JSON.stringify(followers)
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  const followerPromises = followers.map((follow) =>
    getFarcasterUserByFid(follow.fid)
  );
  const followerData = await Promise.all(followerPromises);

  let next = null;
  if (followers.length === limit) {
    next = `${followers[followers.length - 1].timestamp.getTime()}-${
      followers[followers.length - 1].id
    }`;
  }

  return [followerData, next];
};

const getFarcasterCastReactions = async (hash, limit, cursor) => {
  const memCached = getMemcachedClient();
  const [offset, lastId] = cursor ? cursor.split("-") : [null, null];
  let reactions;
  if (cursor) {
    try {
      const data = await memCached.get(
        `getFarcasterCastReactions:${hash}:${limit}:${cursor}`
      );
      if (data) {
        reactions = JSON.parse(data.value).map(
          (reaction) => new Reactions(reaction)
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!reactions) {
    reactions = await Reactions.find({
      targetHash: hash,
      timestamp: { $lt: offset || Date.now() },
      id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
      deletedAt: null,
    })
      .sort({ timestamp: -1 })
      .limit(limit);
    if (cursor) {
      try {
        await memCached.set(
          `getFarcasterCastReactions:${hash}:${limit}:${cursor}`,
          JSON.stringify(reactions)
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  const reactionPromises = reactions.map((reaction) =>
    getFarcasterUserByFid(reaction.fid)
  );
  const reactionData = await Promise.all(reactionPromises);

  let next = null;
  if (reactions.length === limit) {
    next = `${reactions[reactions.length - 1].timestamp.getTime()}-${
      reactions[reactions.length - 1].id
    }`;
  }

  return [reactionData, next];
};

const getFarcasterCastLikes = async (hash, limit, cursor) => {
  const [offset, lastId] = cursor ? cursor.split("-") : [null, null];
  const memcached = getMemcachedClient();
  let likes;
  if (cursor) {
    try {
      const data = await memcached.get(
        `getFarcasterCastLikes:${hash}:${limit}:${cursor}`
      );
      if (data) {
        likes = JSON.parse(data.value).map((like) => new Reactions(like));
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!likes) {
    likes = await Reactions.find({
      targetHash: hash,
      reactionType: ReactionType.REACTION_TYPE_LIKE,
      id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
      timestamp: { $lt: offset || Date.now() },
      deletedAt: null,
    })
      .sort({ timestamp: -1 })
      .limit(limit);
    if (cursor) {
      try {
        await memcached.set(
          `getFarcasterCastLikes:${hash}:${limit}:${cursor}`,
          JSON.stringify(likes)
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  const likePromises = likes.map((like) => getFarcasterUserByFid(like.fid));
  const likeData = await Promise.all(likePromises);

  let next = null;
  if (likes.length === limit) {
    next = `${likes[likes.length - 1].timestamp.getTime()}-${
      likes[likes.length - 1].id
    }`;
  }

  return [likeData, next];
};

const getFarcasterCastRecasters = async (hash, limit, cursor) => {
  const [offset, lastId] = cursor ? cursor.split("-") : [null, null];
  const memcached = getMemcachedClient();
  let recasts;
  if (cursor) {
    try {
      const data = await memcached.get(
        `getFarcasterCastRecasters:${hash}:${limit}:${cursor}`
      );
      if (data) {
        recasts = JSON.parse(data.value).map((recast) => new Reactions(recast));
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (!recasts) {
    recasts = await Reactions.find({
      targetHash: hash,
      reactionType: ReactionType.REACTION_TYPE_RECAST,
      id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
      timestamp: { $lt: offset || Date.now() },
      deletedAt: null,
    }).limit(limit);
    if (cursor) {
      try {
        await memcached.set(
          `getFarcasterCastRecasters:${hash}:${limit}:${cursor}`,
          JSON.stringify(recasts)
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  const recastPromises = recasts.map((recast) =>
    getFarcasterUserByFid(recast.fid)
  );
  const recastData = await Promise.all(recastPromises);
  let next = null;
  if (recasts.length === limit) {
    next = `${recasts[recasts.length - 1].timestamp.getTime()}-${
      recasts[recasts.length - 1].id
    }`;
  }

  return [recastData, next];
};

const getFarcasterFeed = async ({
  limit = 10,
  cursor = null,
  context = {},
  trending = false,
}) => {
  const memCached = getMemcachedClient();
  // cursor is "timestamp"-"id of last cast"
  const [offset, lastId] = cursor ? cursor.split("-") : [null, null];

  // determine time 24 hours ago
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const threshold = 200;

  // create a basic query for casts
  let query = {
    timestamp: { $lt: offset || Date.now() },
    id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
    deletedAt: null,
    globalScore: { $gt: threshold },
  };

  // modify query for trending
  if (trending) {
    query.timestamp = { $gt: oneDayAgo, ...query.timestamp };
  }

  // find casts based on the query
  let casts;
  try {
    if (cursor) {
      const data = await memCached.get(
        `getFarcasterFeed:${
          context?.fid || "global"
        }:${trending}:${limit}:${cursor}`
      );
      if (data) {
        casts = JSON.parse(data.value).map((cast) => new Casts(cast));
      }
    }
  } catch (e) {
    console.error(e);
  }

  if (!casts) {
    casts = await Casts.find(query)
      .sort(trending ? { globalScore: -1, timestamp: -1 } : { timestamp: -1 })
      .limit(limit);
    try {
      if (cursor) {
        await memCached.set(
          `getFarcasterFeed:${
            context?.fid || "global"
          }:${trending}:${limit}:${cursor}`,
          JSON.stringify(casts)
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  const castPromises = casts.map((cast) =>
    getFarcasterFeedCastByHash(cast.hash, context)
  );
  const castData = await Promise.all(castPromises);

  // filter out undefined
  const filteredCastData = castData.filter((cast) => !!cast);

  // filter by unique hashes
  const uniqueCasts = filteredCastData.reduce((acc, cast) => {
    if (!acc[cast.hash]) {
      acc[cast.hash] = cast;
    } else {
      // If the hash already exists, compare childrenCasts lengths
      if (cast.childrenCasts.length > acc[cast.hash].childrenCasts.length) {
        acc[cast.hash] = cast;
      }
    }
    return acc;
  }, {});

  let next = null;
  if (casts.length === limit) {
    next = `${casts[casts.length - 1].timestamp.getTime()}-${
      casts[casts.length - 1].id
    }`;
  }

  return [Object.values(uniqueCasts), next];
};

const getFarcasterUnseenNotificationsCount = async ({ lastSeen, context }) => {
  if (!context.fid) return 0;
  const memcached = getMemcachedClient();
  try {
    const data = await memcached.get(
      `getFarcasterUnseenNotificationsCount:${context.fid}`
    );
    if (data) {
      return data.value;
    }
  } catch (e) {
    console.error(e);
  }
  // cursor is "timestamp"-"id of last notification"
  const count = await Notifications.countDocuments({
    toFid: context.fid,
    timestamp: { $gt: lastSeen },
    deletedAt: null,
  });

  try {
    await memcached.set(
      `getFarcasterUnseenNotificationsCount:${context.fid}`,
      count
    );
  } catch (e) {
    console.error(e);
  }

  return count;
};

const getFarcasterNotifications = async ({ limit, cursor, context }) => {
  // cursor is "timestamp"-"id of last notification"
  const [offset, lastId] = cursor ? cursor.split("-") : [null, null];
  const memcached = getMemcachedClient();
  let notifications;
  if (cursor) {
    try {
      const data = await memcached.get(
        `getFarcasterNotifications:${context.fid}:${limit}:${cursor}`
      );
      if (data) {
        notifications = JSON.parse(data.value).map((n) => new Notifications(n));
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (!notifications) {
    notifications = await Notifications.find({
      toFid: context.fid,
      timestamp: { $lt: offset || Date.now() },
      fromFid: { $ne: context.fid },
      id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
      deletedAt: null,
    })
      .sort({ timestamp: -1 })
      .limit(limit);

    if (cursor) {
      try {
        await memcached.set(
          `getFarcasterNotifications:${context.fid}:${limit}:${cursor}`,
          JSON.stringify(notifications)
        );
      } catch (e) {
        console.error(e);
      }
    }
  }
  let next = null;
  if (notifications.length === limit) {
    next = `${notifications[notifications.length - 1].timestamp.getTime()}-${
      notifications[notifications.length - 1].id
    }`;
  }

  const data = await Promise.all(
    notifications.map(async (notification) => {
      const actor = await getFarcasterUserByFid(notification.fromFid);

      let content = {};
      if (
        ["reply", "mention", "reaction"].includes(notification.notificationType)
      ) {
        content.cast = await getFarcasterCastByHash(
          notification.payload.castHash,
          context
        );
      }

      const returnData = {
        type: notification.notificationType,
        timestamp: notification.timestamp.getTime(),
        actor,
        content,
      };
      if (notification.notificationType === "reaction") {
        returnData.reactionType = notification.payload.reactionType;
      }
      return returnData;
    })
  );

  return [data, next];
};

module.exports = {
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
  getFarcasterUserByCustodyAddress,
  getFarcasterNotifications,
  getFarcasterUnseenNotificationsCount,
  getFarcasterUserAndLinksByFid,
  getFarcasterUserAndLinksByUsername,
  getFarcasterUserByConnectedAddress,
  getConnectedAddressForFid,
  createOrFindExternalFarcasterUser,
  postMessage,
  searchFarcasterUserByMatch,
};
