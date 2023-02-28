const { CommunityRoom } = require("../models/CommunityRoom");
const { AccountAddress } = require("../models/AccountAddress");

class CommunityRoomService {
  // Deprecated, use setPeer instead
  async getPeers(_root, { communityId }, _context) {
    if (!communityId)
      throw new Error("CommunityRoomService#getPeers communityId is required");
    let communityRoom = await CommunityRoom.findOne({ community: communityId });
    if (!communityRoom) {
      communityRoom = await CommunityRoom.create({ community: communityId });
    }
    let newPeers = new Map();
    let uniqueUsernames = new Set();
    communityRoom.peers.forEach((peer, peerId) => {
      if (
        peer.expiresAt > Date.now() &&
        peer.username &&
        peer.peerId &&
        !uniqueUsernames.has(peer.username)
      ) {
        newPeers.set(peerId, peer);
        uniqueUsernames.add(peer.username);
      }
    });
    communityRoom.peers = newPeers;
    await communityRoom.save();
    return Array.from(communityRoom.peers.values());
  }

  async setPeer(_root, { communityId, peerId, account }, _) {
    if (!communityId)
      throw new Error("CommunityRoomService#setPeer communityId is required");
    let communityRoom = await CommunityRoom.findOne({ community: communityId });
    if (!communityRoom) {
      communityRoom = await CommunityRoom.create({ community: communityId });
    }

    let newPeers = new Map();
    let accountUsername = account?.username;
    if (!accountUsername) {
      const accountAddress = await AccountAddress.findById(account?.addressId);
      accountUsername = accountAddress?.address || `ANON-${account._id}`;
    }
    communityRoom.peers.forEach((peer, peerId) => {
      if (peer.expiresAt > Date.now() && peer.username && peer.peerId) {
        newPeers.set(peerId, peer);
      }
    });
    communityRoom.peers = newPeers;

    const finalPeerId = peerId; // trust the peerId is unique, expect uuid

    communityRoom.peers.set(finalPeerId, {
      peerId: finalPeerId,
      expiresAt: new Date(Date.now() + 1000 * 5),
      username: accountUsername,
    });

    await communityRoom.save();
    return Array.from(communityRoom.peers.values());
  }
}

module.exports = { Service: CommunityRoomService };
