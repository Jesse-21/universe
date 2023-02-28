const HTMLParser = require("node-html-parser");
const mongoose = require("mongoose");
const { Expo } = require("expo-server-sdk");
const Sentry = require("@sentry/node");

const { Notification } = require("../models/Notification");
const { Post } = require("../models/Post");
const { Community } = require("../models/Community");
const { AccountRelationship } = require("../models/AccountRelationship");
const { AccountAddress } = require("../models/AccountAddress");
const { AccountThread } = require("../models/AccountThread");
const { Account } = require("../models/Account");

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

class NotificationService {
  /** Triggered after a reactForPost mutation by currentAccount */
  async reactForPostNotification(_, { post, accountReaction }, context) {
    /** @TODO add email notification to context.auth.account */
    if (!post || !post.account) {
      return null;
    }
    const community = await Community.findById(post?.community);
    const externalUrl = community
      ? `https://beb.xyz/${community.bebdomain}?postId=${post._id}`
      : `https://beb.xyz/?postId=${post._id}`;

    if (accountReaction.reactions.likes) {
      if (post.account.toString() === context.account._id.toString()) {
        return null;
      }
      const notification = await Notification.createForReceiver({
        initiatorId: context.account._id,
        receiverId: post.account,
        type: "POST_REACTION",
        title: `${context.account.username || "Anon"} upvoted your post`,
        contentRaw: post.richContent.content?.raw,
        contentHtml: post.richContent.content?.html,
        contentJson: post.richContent.content?.json,
        externalUrl,
        imageId: context.account.profileImage,
      });
      if (!notification) {
        return null;
      }

      await post.populate("account");
      for (const token of post.account.expoPushTokens || []) {
        if (!Expo.isExpoPushToken(token) || token.includes("SIMULATOR")) {
          console.log(`Push token ${token} is not a valid Expo push token`);
          continue;
        }
        try {
          const tickets = await expo.sendPushNotificationsAsync([
            {
              to: token,
              sound: "default",
              badge: 1,
              title: `${context.account.username || "Anon"} upvoted your post`,
              body: post.richContent.content?.raw || "",
              data: {
                type: "POST_REACTION",
                postId: post._id,
                notificationId: notification._id,
                externalUrl,
              },
            },
          ]);
          console.log(
            `sendPushNotificationsAsync#tickets=${JSON.stringify(tickets)}`
          );
        } catch (error) {
          console.error(error);
          Sentry.captureException(error);
        }
      }

      return notification;
    }

    return null;
  }

  /** Triggered after a createPostOrReplyForAccount mutation by currentAccount */
  async createReplyNotification(_, { post }, context) {
    const parent = await Post.findById(post?.parent).select("account");
    if (!post || !parent) {
      return null;
    }

    const community = await Community.findById(post?.community);
    const externalUrl = community
      ? `https://beb.xyz/${community.bebdomain}?postId=${post.parent}`
      : `https://beb.xyz/?postId=${post.parent}`;

    const notification = await Notification.createForReceiver({
      initiatorId: context.account._id,
      receiverId: parent.account,
      type: "POST_COMMENT",
      title: `🔥 ${context.account.username || "Anon"} commented on your post`,
      contentRaw: post.richContent.content?.raw,
      contentHtml: post.richContent.content?.html,
      contentJson: post.richContent.content?.json,
      externalUrl,
      imageId: context.account.profileImage,
    });
    if (!notification) {
      return null;
    }

    await parent.populate("account");
    for (const token of parent.account.expoPushTokens || []) {
      if (!Expo.isExpoPushToken(token) || token.includes("SIMULATOR")) {
        console.log(`Push token ${token} is not a valid Expo push token`);
        continue;
      }
      try {
        const tickets = await expo.sendPushNotificationsAsync([
          {
            to: token,
            sound: "default",
            badge: 1,
            title: `${
              context.account.username || "Anon"
            } commented on your post`,
            body: post.richContent.content?.raw || "",
            data: {
              type: "POST_COMMENT",
              postId: post._id,
              notificationId: notification._id,
              externalUrl,
            },
          },
        ]);
        console.log(
          `sendPushNotificationsAsync#tickets=${JSON.stringify(tickets)}`
        );
      } catch (error) {
        console.error(error);
        Sentry.captureException(error);
      }
    }

    return notification;
  }

  /** Triggered after a toggleFollow mutation by currentAccount */
  async createConnectionRequestNotification(_, { relationship }, context) {
    const twoWayRelationship = await AccountRelationship.getTwoWayRelationship({
      from: context.account._id,
      to: relationship.to,
    });
    const address = await AccountAddress.findOne({
      account: context.account._id,
    });
    // only send if and I am following them
    if (address && twoWayRelationship && twoWayRelationship.iFollowThem) {
      const notification = await Notification.createForReceiver({
        initiatorId: context.account._id,
        receiverId: relationship.to,
        type: "CONNECTION_REQUEST",
        title: twoWayRelationship.theyFollowMe
          ? `✌️ ${context.account.username || "Anon"} followed you back`
          : `✌️ ${context.account.username || "Anon"} followed you`,
        contentRaw: twoWayRelationship.theyFollowMe
          ? "You are now connected. Send a GM!"
          : "Follow them back to connect.",

        imageId: context.account.profileImage,
      });

      return notification;
    }
    return null;
  }

  /** Triggered after a createPostOrReplyForAccount with mention */
  async createMentionsNotification(_, { post }, context) {
    const html = post?.richContent?.content?.html;
    if (!post || !post.account || !html) return;
    const root = HTMLParser.parse(html);
    const mentions = root.querySelectorAll('[data-type="mention"]');
    const community = await Community.findById(post?.community);
    const externalUrl = community
      ? `https://beb.xyz/${community.bebdomain}?postId=${post._id}`
      : `https://beb.xyz/?postId=${post._id}`;

    const notifications = await Promise.all(
      mentions.map(async (mention) => {
        const address = mention.getAttribute("data-id");
        const accountAddress = await AccountAddress.findOne({
          address,
        });
        if (!accountAddress) return null;

        const notification = await Notification.createForReceiver({
          initiatorId: context.accountId || context.account._id,
          receiverId: accountAddress.account,
          type: "POST_MENTION",
          title: `${context.account.username || "Anon"} mentioned you`,
          contentRaw: post.richContent.content?.raw,
          contentHtml: post.richContent.content?.html,
          contentJson: post.richContent.content?.json,
          externalUrl,
          imageId: context.account.profileImage,
        });
        if (!notification) {
          return null;
        }

        await accountAddress.populate("account");
        for (const token of accountAddress.account.expoPushTokens || []) {
          if (!Expo.isExpoPushToken(token) || token.includes("SIMULATOR")) {
            console.log(`Push token ${token} is not a valid Expo push token`);
            continue;
          }
          try {
            const tickets = await expo.sendPushNotificationsAsync([
              {
                to: token,
                sound: "default",
                badge: 1,
                title: `${context.account.username || "Anon"} mentioned you`,
                body: post.richContent.content?.raw || "",
                data: {
                  type: "POST_MENTION",
                  postId: post._id,
                  notificationId: notification._id,
                  externalUrl,
                },
              },
            ]);
            console.log(
              `sendPushNotificationsAsync#tickets=${JSON.stringify(tickets)}`
            );
          } catch (error) {
            console.error(error);
            Sentry.captureException(error);
          }
        }

        return notification;
      })
    );

    return notifications;
  }

  /** Triggered after a createThreadMessage mutation by currentAccount */
  async createThreadMessageNotification(_, { threadMessage }, context) {
    if (!threadMessage || !threadMessage.thread) return null;

    const recipientAccountThreads =
      await AccountThread.getAccountThreadByThread({
        exceptSelfId: context.accountId,
        threadId: threadMessage.thread,
      });
    const recipientAccounts = await Account.find({
      _id: {
        $in: recipientAccountThreads.map((accountThread) =>
          mongoose.Types.ObjectId(accountThread.account)
        ),
      },
      deleted: false,
    });
    const expoPushTokens = recipientAccounts.reduce((acc, account) => {
      return acc.concat(account.expoPushTokens || []);
    }, []);

    for (const token of expoPushTokens) {
      if (!Expo.isExpoPushToken(token) || token.includes("SIMULATOR")) {
        console.log(`Push token ${token} is not a valid Expo push token`);
        continue;
      }
      try {
        const tickets = await expo.sendPushNotificationsAsync([
          {
            to: token,
            sound: "default",
            badge: 1,
            title: `${context.account?.username || "Anon"} sent you a message`,
            body: threadMessage.richContent?.content?.raw || "",
          },
        ]);
        console.log(
          `sendPushNotificationsAsync#tickets=${JSON.stringify(tickets)}`
        );
      } catch (error) {
        console.error(error);
        Sentry.captureException(error);
      }
    }
  }
}

module.exports = { Service: NotificationService };
