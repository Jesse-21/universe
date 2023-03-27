const mongoose = require("mongoose");
const axios = require("axios").default;
const axiosRetry = require("axios-retry");
axiosRetry(axios, { retries: 3 });

const { cleanIframeHtml } = require("../helpers/html-sanitize-and-store");

const { schema } = require("../schemas/richBlocks/link");

const metascraper = require("metascraper")([
  require("metascraper-description")(),
  require("metascraper-image")(),
  require("metascraper-logo")(),
  require("metascraper-title")(),
  require("metascraper-url")(),
  require("metascraper-iframe")(),
]);

const Sentry = require("@sentry/node");

const TIMEOUT = 10000;

const imgurRegex = /https:\/\/i.imgur.com\/\w+(.(png|jpg|jpeg|gif))/;

/** @TODO add caching refetch and refactor to service? */
/** @TODO add testing? */
class LinkClass {
  static ping() {
    console.log("model: LinkClass");
  }

  static async getHtml(targetUrl) {
    let html;
    if (targetUrl.includes("twitter.com")) {
      const { data } = await axios.get(
        `https://publish.twitter.com/oembed?url=${targetUrl}`,
        {
          timeout: TIMEOUT,
        }
      );
      html = data.html;
    } else {
      const { data } = await axios.get(targetUrl, {
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "User-Agent":
            "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)", // facebook OG crawler agent
        },
        timeout: TIMEOUT,
      });
      html = data;
    }
    return html;
  }

  static async createRichLink({ url: targetUrl, callback, onError }) {
    if (!targetUrl) return null;
    if (targetUrl.includes(".pdf")) {
      // Skip PDFs due to segfaults on large files
      return callback?.(null) || null;
    }
    if (targetUrl.includes(".dmg")) {
      // Skip DMGs due to segfaults on large files
      return callback?.(null) || null;
    }
    if (targetUrl.includes(".zip")) {
      // Skip ZIPs due to segfaults on large files
      return callback?.(null) || null;
    }

    try {
      if (targetUrl.includes("farcaster://")) {
        const farcasterApptoken = process.env.BEB_FARCASTER_APP_TOKEN;
        const hashes = targetUrl.split("farcaster://casts/")[1];
        const finalHash = hashes.split("/")[0];
        const farcasterUrl = `https://api.warpcast.com/v2/cast?hash=${finalHash}`;
        const { data } = await axios.get(farcasterUrl, {
          headers: {
            Authorization: `Bearer ${farcasterApptoken}`,
            accept: "application/json",
          },
        });
        const cast = data.result.cast;
        const html = `
        <div class="farcaster-embed">
        <div class="farcaster-embed__header">
          <div class="farcaster-embed__header__title">
            ${cast.text}
          </div>
          <div class="farcaster-embed__header__author">
            <i>- ${cast.author.username} on ${new Date(
          cast.timestamp
        ).toDateString()}</i>
          </div>
        </div>
        </div>
        `;
        // match imgur regex with cast.text
        const match = cast.text.match(imgurRegex);
        const imgur = match ? match[0] : null;

        const link = new Link();
        callback?.(link); // in case we want to async scrape the link
        link.iframe = html;
        link.image = imgur;
        link.url = `https://warpcast.com/${cast.author.username}/${finalHash}`;
        link.title = cast.text;
        return await link.save();
      }

      const html = await LinkClass.getHtml(targetUrl);
      const link = new Link();
      callback?.(link); // in case we want to async scrape the link

      const {
        description,
        image,
        title,
        logo,
        url: cleanUrl,
        iframe: rawIframe,
      } = await metascraper({
        html,
        url: targetUrl,
      });

      /**@TODO we only support twitter iframe for now */
      const iframe = rawIframe
        ? cleanUrl?.indexOf("twitter") !== -1
          ? cleanIframeHtml(rawIframe)
          : null
        : null;

      link.url = cleanUrl;
      link.title = title;
      link.description = description;
      link.image = image;
      link.logo = logo;
      link.iframe = iframe;

      return await link.save();
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      onError?.(e);
      return null;
    }
  }
}

schema.loadClass(LinkClass);

const Link = mongoose.models.Link || mongoose.model("Link", schema);

module.exports = {
  Link,
};
