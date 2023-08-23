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
} = require("../models/farcaster");

const getFarcasterUserByFid = async (fid) => {
  const [following, followers, allUserData] = await Promise.all([
    Links.countDocuments({ fid, type: "follow" }),
    Links.countDocuments({
      targetFid: fid,
      type: "follow",
    }),
    UserData.find({ fid }),
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

const getFarcasterUserByUsername = async (username) => {
  // convert to hex with 0x prefix
  const hexUsername = "0x" + Buffer.from(username, "ascii").toString("hex");

  const userData = await UserData.findOne({
    value: hexUsername,
    type: UserDataType.USER_DATA_TYPE_USERNAME,
  });
  if (userData) {
    return await getFarcasterUserByFid(userData.fid);
  }
  return null;
};

const getFarcasterCastByHash = async (hash) => {
  const cast = await Casts.findOne({ hash });
  if (!cast) return null;

  const [parentAuthor, author, repliesCount, reactionsCount, recastsCount] =
    await Promise.all([
      getFarcasterUserByFid(cast.parentFid),
      getFarcasterUserByFid(cast.fid),
      Casts.countDocuments({ parentHash: cast.hash }),
      Reactions.countDocuments({
        targetHash: cast.hash,
        reactionType: ReactionType.REACTION_TYPE_LIKE,
      }),
      Reactions.countDocuments({
        targetHash: cast.hash,
        reactionType: ReactionType.REACTION_TYPE_RECAST,
      }),
    ]);

  const mentionPromises = cast.mentions.map((mention) =>
    getFarcasterUserByFid(mention)
  );
  const mentionUsers = await Promise.all(mentionPromises);

  let text = cast.text;
  for (let i = 0; i < mentionUsers.length; i++) {
    const mentionPosition = cast.mentionsPositions[i];
    const mentionUsername = mentionUsers[i].username;

    const mentionLink = `@${mentionUsername}`;
    text =
      text.slice(0, mentionPosition) +
      mentionLink +
      text.slice(mentionPosition);
  }

  let threadHash = cast.hash;
  while (threadHash !== cast.parentHash) {
    // derive threadHash (first cast in the thread) by travelling up the parentHash chain until the parentHash as the hash
    const parentCast = await Casts.findOne({ hash: threadHash });
    if (!parentCast.parentHash) break;
    threadHash = parentCast.parentHash;
  }

  const data = {
    hash: cast.hash,
    parentHash: cast.parentHash,
    parentFid: cast.parentFid,
    parentUrl: cast.parentUrl,
    threadHash,
    text: text,
    embeds: JSON.parse(cast.embeds),
    mentions: cast.mentions,
    mentionsPositions: cast.mentionsPositions,
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
    },
  };

  return data;
};

const getFarcasterCastByShortHash = async (shortHash, username) => {
  // use username, hash to find cast
  const user = await getFarcasterUserByUsername(username);
  if (!user) return null;

  const cast = await Casts.findOne({
    hash: { $regex: shortHash, $options: "i" },
    fid: user.fid,
  });
  if (!cast) return null;

  return await getFarcasterCastByHash(cast.hash);
};

const getFarcasterAllCastsInThread = async (threadHash) => {
  const parentCast = await Casts.findOne({ hash: threadHash });
  if (!parentCast) return null;

  // recursively find all children casts where parentHash != castHash
  const findChildren = async (castHash) => {
    const children = await Casts.find({ parentHash: castHash });
    const childrenPromises = children.map((child) =>
      getFarcasterCastByHash(child.hash)
    );
    const childrenData = await Promise.all(childrenPromises);

    const grandChildrenPromises = childrenData.map((childData) =>
      findChildren(childData.hash)
    );
    const allGrandChildren = await Promise.all(grandChildrenPromises);

    for (let i = 0; i < allGrandChildren.length; i++) {
      childrenData.push(...allGrandChildren[i]);
    }

    return childrenData;
  };

  const children = await findChildren(threadHash);

  const parentCastData = await getFarcasterCastByHash(parentCast.hash);

  // return as an array
  return [parentCastData, ...children];
};

const getFarcasterCasts = async (fid, limit, offset) => {
  const casts = await Casts.find({
    fid,
    timestamp: { $lt: offset || Date.now() },
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

const getFarcasterFeed = async (limit, offset) => {
  // find recent trending casts
  const trendingCasts = await Casts.find({
    timestamp: { $lt: offset || Date.now() },
  })
    .sort({ timestamp: -1 })
    .limit(limit);

  const trendingCastPromises = trendingCasts.map((cast) =>
    getFarcasterCastByHash(cast.hash)
  );
  const trendingCastData = await Promise.all(trendingCastPromises);

  let next = null;
  if (trendingCasts.length === limit) {
    next = trendingCasts[trendingCasts.length - 1].timestamp.getTime();
  }

  return [trendingCastData, next];
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
};