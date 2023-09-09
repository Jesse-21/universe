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

// TODO: cache this as author schema and sync with hubreplicator
const getFarcasterUserByFid = async (fid) => {
  if (!fid) return null;
  const [following, followers, allUserData, fids] = await Promise.all([
    Links.countDocuments({ fid, type: "follow", deletedAt: null }),
    Links.countDocuments({
      targetFid: fid,
      type: "follow",
      deletedAt: null,
    }),
    UserData.find({ fid, deletedAt: null }),
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

    const convertedData = Buffer.from(hexString, "hex").toString("utf8");
    switch (userData.type) {
      case UserDataType.USER_DATA_TYPE_USERNAME:
        user.username = convertedData;
        break;
      case UserDataType.USER_DATA_TYPE_DISPLAY:
        user.displayName = convertedData;
        break;
      case UserDataType.USER_DATA_TYPE_PFP:
        user.pfp.url = convertedData;
        break;
      case UserDataType.USER_DATA_TYPE_BIO:
        user.bio.text = convertedData;
        // find "@" mentions not inside a link
        const mentionRegex = /(?<!\]\()@([a-zA-Z0-9_]+)/g;
        let match;
        while ((match = mentionRegex.exec(convertedData))) {
          user.bio.mentions.push(match[1]);
        }
        break;
      case UserDataType.USER_DATA_TYPE_URL:
        user.url = convertedData;
        break;
    }
  }

  user.registeredAt = registeredAt?.getTime();

  return user;
};

const getFarcasterUserAndLinksByFid = async ({ fid, context }) => {
  const user = await getFarcasterUserByFid(fid);
  if (!user) return null;
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
  return {
    ...user,
    isFollowing,
    isFollowedBy,
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
  const pattern = '^\\{"address":"' + connectedAddress.toLowerCase() + '"';

  const verification = await Verifications.findOne({
    claim: { $regex: pattern },
    deletedAt: null,
  });

  if (!verification) return null;

  return await getFarcasterUserByFid(verification.fid);
};

const getConnectedAddressForFid = async (fid) => {
  if (!fid) return null;
  const verification = await Verifications.findOne({
    fid,
    deletedAt: null,
  });

  if (!verification) return null;

  // need to JSON parse the claim

  const claim = JSON.parse(verification.claim);

  return claim.address;
};

const getFidByCustodyAddress = async (custodyAddress) => {
  if (!custodyAddress) return null;
  const fid = await Fids.findOne({ custodyAddress, deletedAt: null });
  if (!fid) return null;

  return fid.fid;
};

const getFarcasterUserByUsername = async (username) => {
  // convert to hex with 0x prefix
  const hexUsername = "0x" + Buffer.from(username, "ascii").toString("hex");

  const userData = await UserData.findOne({
    value: hexUsername,
    type: UserDataType.USER_DATA_TYPE_USERNAME,
    deletedAt: null,
  });
  if (userData) {
    return await getFarcasterUserByFid(userData.fid);
  }
  return null;
};

const getFarcasterUserAndLinksByUsername = async ({ username, context }) => {
  // convert to hex with 0x prefix
  const hexUsername = "0x" + Buffer.from(username, "ascii").toString("hex");

  const userData = await UserData.findOne({
    value: hexUsername,
    type: UserDataType.USER_DATA_TYPE_USERNAME,
    deletedAt: null,
  });
  if (userData) {
    return await getFarcasterUserAndLinksByFid({
      fid: userData.fid,
      context,
    });
  }
  return null;
};

const getFarcasterCastByHash = async (hash, context = {}) => {
  const cast = await Casts.findOne({ hash, deletedAt: null });
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
    getFarcasterUserByFid(cast.fid),
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

  if (context.accountId) {
    data.isSelfLike = await Reactions.exists({
      targetHash: cast.hash,
      fid: context.fid,
      reactionType: ReactionType.REACTION_TYPE_LIKE,
      deletedAt: null,
    });
    data.isSelfRecast = await Reactions.exists({
      targetHash: cast.hash,
      fid: context.fid,
      reactionType: ReactionType.REACTION_TYPE_RECAST,
      deletedAt: null,
    });
    data.isFollowing = await Links.exists({
      fid: context.fid,
      targetFid: cast.fid,
      type: "follow",
      deletedAt: null,
    });
  }

  return data;
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

const getFarcasterCastByShortHash = async (shortHash, username) => {
  // use username, hash to find cast
  const user = await getFarcasterUserByUsername(username);
  if (!user) return null;

  const cast = await Casts.findOne({
    hash: { $regex: `^${shortHash}` },
    fid: user.fid,
    deletedAt: null,
  });
  if (!cast) return null;

  return await getFarcasterCastByHash(cast.hash);
};

const getFarcasterAllCastsInThread = async (
  threadHash,
  context,
  limit,
  cursor = null
) => {
  const parentCast = await Casts.findOne({ hash: threadHash, deletedAt: null });
  if (!parentCast) return null;

  // // recursively find all children casts where parentHash != castHash
  // const findChildren = async (castHash, _context, _limit, _cursor) => {
  //   let query = {
  //     parentHash: castHash,
  //     deletedAt: null,
  //   };

  //   if (_cursor) {
  //     query["timestamp"] = { $lt: new Date(_cursor) };
  //   }

  //   const children = await Casts.find(query)
  //     .sort({ timestamp: -1 })
  //     .limit(_limit);

  //   if (!children.length) return [];

  //   const childrenPromises = children.map((child) =>
  //     getFarcasterCastByHash(child.hash, _context)
  //   );

  //   const childrenData = await Promise.all(childrenPromises);

  //   if (childrenData.length < _limit) {
  //     const remainingLimit = _limit - childrenData.length;
  //     const grandChildrenPromises = childrenData.map((childData) =>
  //       findChildren(
  //         childData.hash,
  //         _context,
  //         remainingLimit,
  //         children[children.length - 1].timestamp
  //       )
  //     );

  //     const allGrandChildren = await Promise.all(grandChildrenPromises);

  //     for (let i = 0; i < allGrandChildren.length; i++) {
  //       childrenData.push(...allGrandChildren[i]);
  //     }
  //   }

  //   return childrenData;
  // };
  const childrenCasts = await Casts.find({
    threadHash: threadHash,
    deletedAt: null,
  }).sort({ timestamp: -1 });
  // .limit(_limit);

  const children = await Promise.all(
    childrenCasts.map((c) => getFarcasterCastByHash(c.hash, context))
  );

  const parentCastData = await getFarcasterCastByHash(parentCast.hash, context);

  const lastCursor =
    children.length > 0 ? children[children.length - 1].timestamp : null;

  // Return an array of data and the cursor for the next batch
  return [[parentCastData, ...children], lastCursor];
};

const getFarcasterCasts = async ({
  fid,
  parentChain,
  limit,
  cursor,
  context,
}) => {
  const [offset, lastId] = cursor ? cursor.split("-") : [null, null];

  const query = {
    timestamp: { $lt: offset || Date.now() },
    id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
    deletedAt: null,
  };

  if (fid) {
    query["fid"] = fid;
  } else if (parentChain) {
    query["text"] = parentChain;
  } else {
    throw new Error("Must provide fid or parentChain");
  }

  const casts = await Casts.find(query).sort({ timestamp: -1 }).limit(limit);

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
  const following = await Links.find({
    fid,
    type: "follow",
    timestamp: { $lt: offset || Date.now() },
    id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
    deletedAt: null,
  })
    .sort({ timestamp: -1 })
    .limit(limit);

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
  const followers = await Links.find({
    targetFid: fid,
    type: "follow",
    timestamp: { $lt: offset || Date.now() },
    id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
    deletedAt: null,
  })
    .sort({ timestamp: -1 })
    .limit(limit);

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
  const [offset, lastId] = cursor ? cursor.split("-") : [null, null];
  const reactions = await Reactions.find({
    targetHash: hash,
    timestamp: { $lt: offset || Date.now() },
    id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
    deletedAt: null,
  })
    .sort({ timestamp: -1 })
    .limit(limit);

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
  const likes = await Reactions.find({
    targetHash: hash,
    reactionType: ReactionType.REACTION_TYPE_LIKE,
    id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
    timestamp: { $lt: offset || Date.now() },
    deletedAt: null,
  })
    .sort({ timestamp: -1 })
    .limit(limit);

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
  const recasts = await Reactions.find({
    targetHash: hash,
    reactionType: ReactionType.REACTION_TYPE_RECAST,
    id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
    timestamp: { $lt: offset || Date.now() },
    deletedAt: null,
  }).limit(limit);

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

const getFarcasterFeed = async ({ limit, cursor, context, trending }) => {
  // cursor is "timestamp"-"id of last cast"
  const [offset, lastId] = cursor ? cursor.split("-") : [null, null];

  // determine time 24 hours ago
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  const dayThreshold = 200;
  const nightThreshold = 100;
  const dayStart = 6;
  const dayEnd = 18;

  let t = (currentHour - dayStart) / (dayEnd - dayStart);
  t = Math.max(0, Math.min(1, t));
  const threshold = Math.round(
    nightThreshold + t * (dayThreshold - nightThreshold)
  );

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
  let casts = await Casts.find(query)
    .sort(trending ? { globalScore: -1, timestamp: -1 } : { timestamp: -1 })
    .limit(limit);

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
  // cursor is "timestamp"-"id of last notification"
  const count = await Notifications.countDocuments({
    toFid: context.fid,
    timestamp: { $gt: lastSeen },
    deletedAt: null,
  });
  return count;
};

const getFarcasterNotifications = async ({ limit, cursor, context }) => {
  // cursor is "timestamp"-"id of last notification"
  const [offset, lastId] = cursor ? cursor.split("-") : [null, null];
  const notifications = await Notifications.find({
    toFid: context.fid,
    timestamp: { $lt: offset || Date.now() },
    fromFid: { $ne: context.fid },
    id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
    deletedAt: null,
  })
    .sort({ timestamp: -1 })
    .limit(limit);
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
};
