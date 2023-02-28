const { Image } = require("../models/Image");
const { Link } = require("../models/Link");
const { Quest } = require("../models/quests/Quest");
const { RichEmbed } = require("../models/RichEmbed");

const { Service: ContentService } = require("./ContentService");
const { Service: _QuestService } = require("./QuestService");

class RichBlockService {
  /**
   * Create a KeyValueFields Block. @TODO this is not an officially supported block type
   * @param {Object} props the props to pass to the block type
   * @returns {Promise<KeyValueFields>}
   */
  async _createKeyValueFieldsSchema({ fields = [] }) {
    return fields
      .filter((f) => f.key)
      .map((f) => ({
        key: f.key,
        value: f.value,
      }));
  }
  /**
   * Create a Content Block. @TODO this is not an officially supported block type
   * @param {Object} props the props to pass to the block type
   * @returns {Promise<Content>}
   */
  async _createContentSchema({ raw, json, html }) {
    const _ContentService = new ContentService();
    const content = await _ContentService.makeContent({
      contentRaw: raw,
      contentJson: json,
      contentHtml: html,
    });
    return content;
  }
  /**
   * Create an Image Block
   * @param {Object} props the props to pass to the block type
   * @returns {Promise<Block>} // Image
   */
  async _createImageBlock({
    src,
    name,
    isVerified,
    verificationOrigin,
    verificationTokenId,
    verificationContractAddress,
    verificationChainId,
    verificationExternalUrl,
  }) {
    const image = await Image.create({
      src,
      name,
      isVerified,
      verificationOrigin,
      verificationTokenId,
      verificationContractAddress,
      verificationChainId,
      verificationExternalUrl,
    });
    return image;
  }
  /**
   * Create an Link Block
   * @param {Object} props the props to pass to the block type
   * @returns {Promise<Block>} // Link
   */
  async _createLinkBlock({ url, image, title, description, logo, iframe }) {
    const link = await Link.create({
      url,
      image,
      title,
      description,
      logo,
      iframe,
    });
    return link;
  }
  /**
   * Create an Quest Block
   * @param {Object} props the props to pass to the block type
   * @returns {Promise<Block>} // Quest
   */
  async _createQuestBlock(props) {
    const QuestService = new _QuestService();
    const quest = await QuestService.createWithRequirementsAndRewards(props);
    return quest;
  }

  /**
   * Create an RichEmbed Block
   * @param {Image} image the props to pass to the child Image Block, resolve to block.image
   * @param {Image} thumbnail the props to pass to the child Image Block, resolve to  block.thumbnail
   * @param {Content} description the props to pass to the child Content Block, resolve to  block.description
   * @returns {Promise<Block>} // RichEmbed
   */
  async _createRichEmbedBlock({
    url,
    title,
    timestamp,
    color,
    thumbnail = {},
    image = {},
    description = {},
    fields = [],
  }) {
    const promises = await Promise.allSettled([
      this.createBlock({ blockType: "IMAGE", ...image }),
      this.createBlock({ blockType: "IMAGE", ...thumbnail }),
      this.createBlockSchema({ schemaType: "CONTENT", ...description }),
      this.createBlockSchema({ schemaType: "KEY_VALUE_FIELDS", fields }),
    ]);
    const [_image, _thumbnail, _descriptionSchema, _fieldsSchema] =
      promises.map((p) => {
        if (p.status === "rejected") {
          return null;
        }
        return p.value;
      });

    const richEmbed = await RichEmbed.create({
      url,
      title,
      timestamp,
      color,
      thumbnail: _thumbnail?._id,
      image: _image?._id,
      description: _descriptionSchema,
      fields: _fieldsSchema,
    });
    return richEmbed;
  }
  /**
   * Create a Block Schema. @TODO this should be eventually deprecated and replaced with a more generic way to create blocks
   * @param {SchemaType} schemaType The schema type to create
   * @param {Object} props the props to pass to the schema type
   * @returns {Promise<BlockSchema>} // Content | KeyValueFields
   */
  async createBlockSchema({ schemaType, ...props }) {
    switch (schemaType) {
      case "CONTENT":
        return this._createContentSchema(props);
      case "KEY_VALUE_FIELDS":
        return this._createKeyValueFieldsSchema(props);
      default:
        throw new Error(`Unsupported block schema type: ${schemaType}`);
    }
  }
  /**
   * Get a Block by blockId
   * @param {BlockTypeEnum} blockType The block type to create
   * @param {Object} props the props to pass to the block type
   * @returns {Promise<Block>} RichBlock
   */
  async getBlock({ blockType, blockId }) {
    let _block = null;
    if (blockType === "IMAGE") {
      _block = await Image.findById(blockId);
    } else if (blockType === "LINK") {
      _block = await Link.findById(blockId);
    } else if (blockType === "RICH_EMBED") {
      _block = await RichEmbed.findById(blockId);
    } else if (blockType === "QUEST") {
      _block = await Quest.findById(blockId);
    }

    return _block;
  }
  /**
   * Create a Block and its nested blocks
   * @param {BlockTypeEnum} blockType The block type to create
   * @param {Object} props the props to pass to the block type
   * @returns {Promise<Block>} RichBlock
   */
  async createBlock({ blockType, ...props }) {
    switch (blockType) {
      case "IMAGE":
        return this._createImageBlock(props);
      case "LINK":
        return this._createLinkBlock(props);
      case "RICH_EMBED":
        return this._createRichEmbedBlock(props);
      case "QUEST":
        return this._createQuestBlock(props);
      default:
        throw new Error(`Unsupported block type: ${blockType}`);
    }
  }
}

module.exports = { Service: RichBlockService };
