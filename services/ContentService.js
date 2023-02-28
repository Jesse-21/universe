const HTMLParser = require("node-html-parser");

const { cleanContentHtml } = require("../helpers/html-sanitize-and-store");

const { Link } = require("../models/Link");

const Sentry = require("@sentry/node");

class ContentService {
  _findFirstLinkOrNull(html) {
    try {
      const root = HTMLParser.parse(html);
      const firstLink = root.querySelector("a");
      if (!firstLink) return null;
      const firstLinkHref = firstLink.getAttribute("href");
      return firstLinkHref || null;
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      return null;
    }
  }
  _jsonStringOrNull(json) {
    try {
      const jsonRes = JSON.stringify(json);
      return jsonRes;
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      return null;
    }
  }

  /** Content helpers */
  _makeContentWithMention({ contentRaw, contentJson, contentHtml }) {
    const root = HTMLParser.parse(contentHtml);
    const mentions = root.querySelectorAll('[data-type="mention"]');

    if (!mentions || !mentions.length)
      return { contentRaw, contentJson, contentHtml };
    mentions.map((mention) => {
      const mentionId = mention.getAttribute("data-id");
      const text = mention.textContent;
      mention.exchangeChild(
        mention.firstChild,
        `<a href="https://beb.xyz?address=${mentionId}">${text}</a>`
      );
    });

    return { contentRaw, contentJson, contentHtml: root.toString() };
  }

  /** Rich content helpers */
  async _makeRichContentWithLinkPreview({
    contentRaw,
    contentJson,
    contentHtml,
    blocks = [],
  }) {
    const firstLinkHref = this._findFirstLinkOrNull(contentHtml);
    if (!firstLinkHref) return { contentRaw, contentJson, contentHtml, blocks };
    await new Promise((resolve) => {
      Link.createRichLink({
        url: firstLinkHref,
        callback: (linkBlock) => {
          if (linkBlock) {
            blocks.push({
              blockType: "LINK",
              blockId: linkBlock._id,
            });
          }
          resolve();
        },
        onError: (e) => {
          console.error(e);
          resolve();
        },
      });
    });
    return { contentRaw, contentJson, contentHtml, blocks };
  }

  _makeRichContentWithBlocks({
    contentRaw,
    contentJson,
    contentHtml,
    blocks = [],
  }) {
    // @TODO sanitize to check if block exists?
    const _blocks = blocks
      .filter((b) => b.blockType && b.blockId)
      .map((b) => {
        return {
          blockType: b.blockType,
          blockId: b.blockId,
        };
      });

    return {
      content: this.makeContent({ contentRaw, contentJson, contentHtml }),
      blocks: _blocks,
    };
  }

  /**
   *
   * @param {string} contentRaw
   * @param {string} contentJson stringified json
   * @param {string} contentHtml stringified html
   * @returns Content
   */
  makeContent({ contentRaw = "", contentJson = "", contentHtml = "" }) {
    const props_1 = this._makeContentWithMention({
      contentRaw,
      contentJson,
      contentHtml,
    });

    return {
      json: this._jsonStringOrNull(props_1.contentJson),
      raw: contentRaw ? `${props_1.contentRaw}` : null,
      html: contentHtml ? `${cleanContentHtml(props_1.contentHtml)}` : null,
    };
  }

  /**
   *
   * @param {string} contentRaw
   * @param {string} contentJson stringified json
   * @param {string} contentHtml stringified html
   * @returns RichContent { blocks: [], content: Content }
   */
  async makeRichContent({
    contentRaw = "",
    contentJson = "",
    contentHtml = "",
    blocks = [],
  }) {
    const props_1 = await this._makeRichContentWithLinkPreview({
      contentRaw,
      contentJson,
      contentHtml,
      blocks,
    });

    return this._makeRichContentWithBlocks(props_1);
  }
}

module.exports = { Service: ContentService };
