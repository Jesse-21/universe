const DataLoader = require("dataloader");

const { Account } = require("../models/Account");
const { Community } = require("../models/Community");
const { Channel } = require("../models/Channel");
const { Post } = require("../models/Post");
const { Image } = require("../models/Image");
const { Role } = require("../models/Role");

const getRolesByIdDataloader = () =>
  new DataLoader(async (ids) => {
    const roles = await Role.find({ _id: { $in: ids } });
    const roleMap = {};
    roles.forEach((role) => {
      roleMap[role._id] = role;
    });
    return ids.map((id) => roleMap[id]);
  });

const getAccountByIdDataloader = () =>
  new DataLoader(async (ids) => {
    const accounts = await Account.find({ _id: { $in: ids } });
    const accountMap = {};
    accounts.forEach((account) => {
      accountMap[account._id] = account;
    });
    return ids.map((id) => accountMap[id]);
  });

const getPostByIdDataloader = () =>
  new DataLoader(async (ids) => {
    const posts = await Post.find({ _id: { $in: ids } });
    const postMap = {};
    posts.forEach((post) => {
      postMap[post._id] = post;
    });
    return ids.map((id) => postMap[id]);
  });

const getCommunityByIdDataloader = () =>
  new DataLoader(async (ids) => {
    const communities = await Community.find({ _id: { $in: ids } });
    const communityMap = {};
    communities.forEach((community) => {
      communityMap[community._id] = community;
    });
    return ids.map((id) => communityMap[id]);
  });

const getChannelsByIdDataloader = () =>
  new DataLoader(async (ids) => {
    const channels = await Channel.find({ _id: { $in: ids } });
    const channelsMap = {};
    channels.forEach((channel) => {
      channelsMap[channel._id] = channel;
    });
    return ids.map((id) => channelsMap[id]);
  });

const getImagesByIdDataloader = () =>
  new DataLoader(async (ids) => {
    const images = await Image.find({ _id: { $in: ids } });
    const imageMap = {};
    images.forEach((image) => {
      imageMap[image._id] = image;
    });
    return ids.map((id) => imageMap[id]);
  });
module.exports = {
  createDataLoaders: () => ({
    accounts: getAccountByIdDataloader(),
    posts: getPostByIdDataloader(),
    communities: getCommunityByIdDataloader(),
    images: getImagesByIdDataloader(),
    channels: getChannelsByIdDataloader(),
    roles: getRolesByIdDataloader(),
  }),
};
