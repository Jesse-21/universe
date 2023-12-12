const {
  NobleEd25519Signer,
  Message,
  makeReactionAdd: makeReactionAddRpc,
  makeReactionRemove: makeReactionRemoveRpc,
  makeCastAdd: makeCastAddRpc,
  makeCastRemove: makeCastRemoveRpc,
  makeLinkAdd: makeLinkAddRpc,
  makeLinkRemove: makeLinkRemoveRpc,
  makeUserDataAdd: makeUserDataAddRpc,
  getInsecureHubRpcClient,
  getSSLHubRpcClient,
} = require("@farcaster/hub-nodejs");

const { postMessage } = require("./farcaster");

const Sentry = require("@sentry/node");

function hexToBytes(hex) {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function extractAndReplaceMentions(
  input,
  usersMap = {} // key: username, value: fid
) {
  let result = "";
  const mentions = [];
  const mentionsPositions = [];

  // Split on newlines and spaces, preserving delimiters
  const splits = input.split(/(\s|\n)/);

  splits.forEach((split, i) => {
    if (split.startsWith("@")) {
      const mentionRegex = /(?<!\]\()@([a-zA-Z0-9_]+(\.[a-z]{2,})*)/g;
      const match = mentionRegex.exec(split);
      const username = match[1];

      // Check if user is in the usersMap
      if (username in usersMap) {
        // Get the starting position of each username mention
        const position = Buffer.from(result).length;

        mentions.push(usersMap[username]);
        mentionsPositions.push(position);
        result += split.replace("@" + username, "");

        // result += '@[...]'; // replace username mention with what you would like
      } else {
        result += split;
      }
    } else {
      result += split;
    }
  });

  // Return object with replaced text and user mentions array
  return {
    text: result,
    mentions,
    mentionsPositions,
  };
}

const makeMessage = async ({
  privateKey,
  messageType,
  body = {},
  fid,
  overrides = {},
}) => {
  if (!privateKey) {
    throw new Error("No private key provided");
  }
  const signer = new NobleEd25519Signer(Buffer.from(privateKey, "hex"));
  let rawMessage;
  try {
    switch (messageType) {
      case 1:
        rawMessage = await makeReactionAddRpc(
          body,
          {
            fid: parseInt(fid),
            network: 1,
          },
          signer
        );
        break;
      case 2:
        rawMessage = await makeCastRemoveRpc(
          body,
          {
            fid: parseInt(fid),
            network: 1,
          },
          signer
        );
        break;
      case 3:
        rawMessage = await makeReactionAddRpc(
          body,
          {
            fid: parseInt(fid),
            network: 1,
          },
          signer
        );
        break;
      case 4:
        rawMessage = await makeReactionRemoveRpc(
          body,
          {
            fid: parseInt(fid),
            network: 1,
          },
          signer
        );
        break;
      case 5:
        rawMessage = await makeLinkAddRpc(
          body,
          {
            fid: parseInt(fid),
            network: 1,
          },
          signer
        );
        break;
      case 6:
        rawMessage = await makeLinkRemoveRpc(
          body,
          {
            fid: parseInt(fid),
            network: 1,
          },
          signer
        );
        break;
      case 11:
        rawMessage = await makeUserDataAddRpc(
          body,
          {
            fid: parseInt(fid),
            network: 1,
          },
          signer
        );
        break;
      default:
        throw new Error("Invalid message type");
    }
  } catch (e) {
    console.error(e);
    throw new Error("Unable to create message: " + e.message);
  }

  if (!rawMessage) {
    throw new Error("Invalid Farcaster data");
  }

  if (!rawMessage.value) {
    throw rawMessage.error || new Error("Invalid Farcaster data");
  }

  let message = rawMessage.value;
  message = Message.toJSON({
    ...message,
    data: {
      ...message.data,
      ...overrides,
    },
  });

  return message;
};

const makeRequest = async (
  privateKey,
  messageType,
  body,
  fid,
  overrides = {},
  bodyOverrides = {}
) => {
  const message = await makeMessage({
    privateKey,
    messageType,
    body,
    fid,
    overrides,
  });
  let isExternal = fid?.slice(0, 2) === "0x" ? true : false;
  const hubClient =
    process.env.HUB_SECURE === "SECURE"
      ? getSSLHubRpcClient(process.env.HUB_ADDRESS)
      : getInsecureHubRpcClient(process.env.HUB_ADDRESS);
  if (!isExternal) {
    // it can also be external if any of the keys or subkeys of bodyOverrides contains 0x
    isExternal = Object.keys(bodyOverrides).some((key) => {
      if (typeof bodyOverrides[key] === "object") {
        return Object.keys(bodyOverrides[key]).some((subkey) => {
          return bodyOverrides[key][subkey]?.slice(0, 2) === "0x";
        });
      }
      return bodyOverrides[key]?.slice?.(0, 2) === "0x";
    });
  }
  const result = await postMessage({
    isExternal: isExternal || fid.startsWith("0x") || false,
    externalFid: fid,
    messageJSON: message,
    hubClient,
    errorHandler: (error) => {
      Sentry.captureException(error);
      console.error(error);
    },
    bodyOverrides,
  });

  return result;
};

const makeCastAdd = async ({
  privateKey,
  text,
  mentionsFids = [],
  mentionsUsernames = [],
  embeds,
  parentHash,
  parentFid,
  parentUrl,
  fid,
}) => {
  const data = extractAndReplaceMentions(
    text,
    mentionsUsernames.reduce((acc, username, i) => {
      acc[username] = mentionsFids[i];
      return acc;
    }, {})
  );

  const body = {
    ...data,
    embeds: embeds || [],
  };
  const bodyOverrides = {};

  if (parentHash) {
    body.parentCastId = {
      hash: hexToBytes(parentHash.slice(2)),
      fid: parseInt(parentFid),
    };
    bodyOverrides.parentCastId = { fid: parentFid };
  }
  if (parentUrl) {
    body.parentUrl = parentUrl;
  }
  bodyOverrides.mentions = body.mentions;
  body.mentions = body.mentions.map((a) => parseInt(a));

  try {
    return await makeRequest(privateKey, 1, body, fid, {}, bodyOverrides); // MESSAGE_TYPE_CAST_ADD = 1
  } catch (e) {
    console.error(e);
    throw new Error(e);
  }
};

const makeCastRemove = async ({ privateKey, targetHash, fid }) => {
  const body = {
    targetHash: hexToBytes(targetHash.slice(2)),
  };

  return await makeRequest(privateKey, 2, body, fid); // MESSAGE_TYPE_CAST_REMOVE = 2
};

const makeLinkAdd = async ({
  privateKey,
  type,
  displayTimestamp,
  targetFid,
  fid,
}) => {
  const body = {
    type: type,
    displayTimestamp: displayTimestamp,
    targetFid: parseInt(targetFid),
  };
  const bodyOverrides = {
    targetFid: targetFid,
  };

  return await makeRequest(privateKey, 5, body, fid, {}, bodyOverrides); // MESSAGE_TYPE_LINK_ADD = 5
};

const makeUsernameDataAdd = async ({ privateKey, value: username, fid }) => {
  const body = {
    type: 6,
    value: fid?.slice(0, 15), // placeholder for now, we want to modify the username later
  };

  return await makeRequest(privateKey, 11, body, fid, {
    userDataBody: {
      value: username,
      type: 6,
    },
  });
};

const makeUserDataAdd = async ({ privateKey, type, value, fid }) => {
  if (type === 6) {
    // username
    return await makeUsernameDataAdd({ value, fid });
  }
  const body = {
    type: type,
    value: value,
  };

  try {
    return await makeRequest(privateKey, 11, body, fid); // MESSAGE_TYPE_LINK_ADD = 5
  } catch (e) {
    throw new Error(e);
  }
};

const makeLinkRemove = async ({ privateKey, type, targetFid, fid }) => {
  const body = {
    type: type,
    targetFid: parseInt(targetFid),
  };
  const bodyOverrides = {
    targetFid: targetFid,
  };

  return await makeRequest(privateKey, 6, body, fid, {}, bodyOverrides); // MESSAGE_TYPE_LINK_REMOVE = 6
};

const makeReactionAdd = async ({
  privateKey,
  type,
  castHash,
  castAuthorFid,
  targetUrl = "", // this is the channel url
  fid,
}) => {
  const body = {
    type: type,
    targetCastId: {
      hash: hexToBytes(castHash.slice(2)),
      fid: parseInt(castAuthorFid),
    },
    // targetUrl: targetUrl,
  };
  const bodyOverrides = {
    targetCastId: {
      fid: castAuthorFid,
    },
  };

  return await makeRequest(privateKey, 3, body, fid, {}, bodyOverrides); // MESSAGE_TYPE_REACTION_ADD = 3
};

const makeReactionRemove = async ({
  privateKey,
  type,
  castHash,
  castAuthorFid,
  targetUrl = "", // this is the channel url
  fid,
}) => {
  const body = {
    type: type,
    targetCastId: {
      hash: hexToBytes(castHash.slice(2)),
      fid: parseInt(castAuthorFid),
    },
    // targetUrl: targetUrl,
  };
  const bodyOverrides = {
    targetCastId: {
      fid: castAuthorFid,
    },
  };

  return await makeRequest(privateKey, 4, body, fid, {}, bodyOverrides); // MESSAGE_TYPE_REACTION_REMOVE = 4
};

const follow = async (props) => {
  return await makeLinkAdd({
    type: "follow",
    ...props,
  });
};

const unfollow = async (props) => {
  return await makeLinkRemove({
    type: "follow",
    ...props,
  });
};

const like = async ({ isRemove, ...props }) => {
  if (isRemove) {
    return await makeReactionRemove({
      type: 1,
      ...props,
    });
  }
  return await makeReactionAdd({
    type: 1,
    ...props,
  });
};

const recast = async ({ isRemove, ...props }) => {
  if (isRemove) {
    return await makeReactionRemove({
      type: 2,
      ...props,
    });
  }
  return await makeReactionAdd({
    type: 2,
    ...props,
  });
};

module.exports = {
  makeCastAdd,
  makeCastRemove,
  makeLinkAdd,
  makeLinkRemove,
  makeReactionAdd,
  makeReactionRemove,
  makeUserDataAdd,
  follow,
  unfollow,
  like,
  recast,
};
