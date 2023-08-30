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

const getFarcasterUserByFid = async (fid) => {
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

  for (const userData of allUserData) {
    if (userData.external) user.external = true;
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

  return user;
};

const getFarcasterUserByCustodyAddress = async (custodyAddress) => {
  const fid = await Fids.findOne({ custodyAddress, deletedAt: null });
  if (!fid) return null;

  return await getFarcasterUserByFid(fid.fid);
};

const getFidByCustodyAddress = async (custodyAddress) => {
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

const getFarcasterCastByHash = async (hash, context = {}) => {
  const cast = await Casts.findOne({ hash, deletedAt: null });
  if (!cast) return null;

  const [
    parentAuthor,
    author,
    repliesCount,
    reactionsCount,
    recastsCount,
    recastersFids,
  ] = await Promise.all([
    getFarcasterUserByFid(cast.parentFid),
    getFarcasterUserByFid(cast.fid),
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
  const mentionUsers = await Promise.all(mentionPromises);
  const recasters = await Promise.all(recastersPromises);

  let text = cast.text;
  let offset = 0;
  let updatedMentionsPositions = []; // Array to store updated positions

  for (let i = 0; i < mentionUsers.length; i++) {
    // Assuming mentionsPositions consider newlines as characters, so no newline adjustment
    const adjustedMentionPosition = cast.mentionsPositions[i];
    const mentionUsername = mentionUsers[i].username;

    const mentionLink = `@${mentionUsername}`;

    // Assuming originalMention field exists in mentionUsers array
    const originalMentionLength = mentionUsers[i].originalMention
      ? mentionUsers[i].originalMention.length
      : 1;

    // Apply the offset only when slicing the text
    const actualPosition = adjustedMentionPosition + offset;
    text =
      text.slice(0, actualPosition) +
      mentionLink +
      " " +
      text.slice(actualPosition + originalMentionLength);

    // Update the offset based on the added mention
    offset += mentionLink.length + 1 - originalMentionLength; // +1 for space

    // Store the adjusted position in the new array
    updatedMentionsPositions.push(actualPosition);
  }

  let threadHash = cast.threadHash;
  if (!threadHash) {
    // threadHash not cached
    threadHash = cast.hash;
    let currentParentHash = cast.parentHash;

    while (currentParentHash) {
      const parentCast = await Casts.findOne({
        hash: currentParentHash,
      });

      if (!parentCast) break; // Exit if no parent cast found
      if (parentCast.threadHash) {
        // threadHash found
        threadHash = parentCast.threadHash;
        break;
      }

      threadHash = parentCast.hash; // Update the threadHash to the current parentCast
      currentParentHash = parentCast.parentHash; // Update the currentParentHash for the next iteration
    }

    cast.threadHash = threadHash;
    cast.save();
  }

  const data = {
    hash: cast.hash,
    parentHash: cast.parentHash,
    parentFid: cast.parentFid,
    parentUrl: cast.parentUrl,
    threadHash,
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
      childrenCasts: [cast],
    };
  }
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

const getFarcasterAllCastsInThread = async (threadHash, context) => {
  const parentCast = await Casts.findOne({ hash: threadHash, deletedAt: null });
  if (!parentCast) return null;

  // recursively find all children casts where parentHash != castHash
  const findChildren = async (castHash, _context) => {
    const children = await Casts.find({
      parentHash: castHash,
      deletedAt: null,
    });
    const childrenPromises = children.map((child) =>
      getFarcasterCastByHash(child.hash, _context)
    );
    const childrenData = await Promise.all(childrenPromises);

    const grandChildrenPromises = childrenData.map((childData) =>
      findChildren(childData.hash, _context)
    );
    const allGrandChildren = await Promise.all(grandChildrenPromises);

    for (let i = 0; i < allGrandChildren.length; i++) {
      childrenData.push(...allGrandChildren[i]);
    }

    return childrenData;
  };

  const children = await findChildren(threadHash, context);

  const parentCastData = await getFarcasterCastByHash(parentCast.hash, context);

  // return as an array
  return [parentCastData, ...children];
};

const getFarcasterCasts = async (fid, limit, offset) => {
  const casts = await Casts.find({
    fid,
    timestamp: { $lt: offset || Date.now() },
    deletedAt: null,
  })
    .sort({ timestamp: -1 })
    .limit(limit);

  const castPromises = casts.map((cast) => getFarcasterCastByHash(cast.hash));
  const castData = await Promise.all(castPromises);

  let next = null;
  if (casts.length === limit) {
    next = casts[casts.length - 1].timestamp.getTime();
  }

  return [castData, next];
};

const getFarcasterFollowing = async (fid, limit, offset) => {
  const following = await Links.find({
    fid,
    type: "follow",
    timestamp: { $lt: offset || Date.now() },
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
    next = following[following.length - 1].timestamp.getTime();
  }

  return [followingData, next];
};

const getFarcasterFollowers = async (fid, limit, offset) => {
  const followers = await Links.find({
    targetFid: fid,
    type: "follow",
    timestamp: { $lt: offset || Date.now() },
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
    next = followers[followers.length - 1].timestamp.getTime();
  }

  return [followerData, next];
};

const getFarcasterCastReactions = async (hash, limit, offset) => {
  const reactions = await Reactions.find({
    targetHash: hash,
    timestamp: { $lt: offset || Date.now() },
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
    next = reactions[reactions.length - 1].timestamp.getTime();
  }

  return [reactionData, next];
};

const getFarcasterCastLikes = async (hash, limit, offset) => {
  const likes = await Reactions.find({
    targetHash: hash,
    reactionType: ReactionType.REACTION_TYPE_LIKE,
    timestamp: { $lt: offset || Date.now() },
    deletedAt: null,
  })
    .sort({ timestamp: -1 })
    .limit(limit);

  const likePromises = likes.map((like) => getFarcasterUserByFid(like.fid));
  const likeData = await Promise.all(likePromises);

  let next = null;
  if (likes.length === limit) {
    next = likes[likes.length - 1].timestamp.getTime();
  }

  return [likeData, next];
};

const getFarcasterCastRecasters = async (hash, limit, offset) => {
  const recasts = await Reactions.find({
    targetHash: hash,
    reactionType: ReactionType.REACTION_TYPE_RECAST,
    timestamp: { $lt: offset || Date.now() },
    deletedAt: null,
  }).limit(limit);

  const recastPromises = recasts.map((recast) =>
    getFarcasterUserByFid(recast.fid)
  );
  const recastData = await Promise.all(recastPromises);
  let next = null;
  if (recasts.length === limit) {
    next = recasts[recasts.length - 1].timestamp.getTime();
  }

  return [recastData, next];
};

const getFarcasterFeed = async ({ limit, offset, context }) => {
  // find recent trending casts
  const trendingCasts = await Casts.find({
    timestamp: { $lt: offset || Date.now() },
    deletedAt: null,
  })
    .sort({ timestamp: -1 })
    .limit(limit);

  const trendingCastPromises = trendingCasts.map((cast) =>
    getFarcasterFeedCastByHash(cast.hash, context)
  );
  const trendingCastData = await Promise.all(trendingCastPromises);
  // filter by unique hashes
  const uniqueCasts = trendingCastData.reduce((acc, cast) => {
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
  if (trendingCasts.length === limit) {
    next = trendingCasts[trendingCasts.length - 1].timestamp.getTime();
  }

  return [Object.values(uniqueCasts), next];
};

const getFarcasterNotifications = async ({ limit, offset, context }) => {
  const notifications = await Notifications.find({
    targetFid: context.fid,
    timestamp: { $lt: offset || Date.now() },
    deletedAt: null,
  })
    .sort({ timestamp: -1 })
    .limit(limit);
  let next = null;
  if (notifications.length === limit) {
    next = notifications[notifications.length - 1].timestamp.getTime();
  }

  return [notifications, next];
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
};
