const { Service } = require("../ContentService");

const { createDb } = require("../../helpers/create-test-db");
const { cleanContentHtml } = require("../../helpers/html-sanitize-and-store");

describe("Content Service tests", () => {
  let db;
  let ContentService;

  beforeEach(() => {
    jest.clearAllMocks();
  });
  beforeAll(async () => {
    db = await createDb();
    await db.connect();
    ContentService = new Service();
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("_findFirstLinkOrNull", () => {
    it("should find the first link in a html string", async () => {
      const html = '<p><a href="http://pump.com">pump.com</a></p>';
      const linkHref = ContentService._findFirstLinkOrNull(html);

      expect(linkHref).toEqual("http://pump.com");
    });

    it("should find the first link if multiple links", async () => {
      const html =
        '<p><a href="http://pump.com">pump.com</a><a href="https://beb.xyz">beb.xyz</a></p>';
      const linkHref = ContentService._findFirstLinkOrNull(html);

      expect(linkHref).toEqual("http://pump.com");
    });

    it("should return null if no link is found", async () => {
      const html = "<p></p>";
      const linkHref = ContentService._findFirstLinkOrNull(html);

      expect(linkHref).toEqual(null);
    });

    it("should return null if the link has no href attribute", async () => {
      const html = "<p><a></a></p>";
      const linkHref = ContentService._findFirstLinkOrNull(html);

      expect(linkHref).toEqual(null);
    });
  });

  describe("_makeContentWithMention", () => {
    it("should replace the html with mentions nodes", () => {
      const html =
        '<p><span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten">@boredKitten</span></p>';
      const { contentHtml } = ContentService._makeContentWithMention({
        contentRaw: "@boredKitten",
        contentJson: null,
        contentHtml: html,
      });

      expect(contentHtml).toEqual(
        `<p><span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten"><a href="https://beb.xyz?address=0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531">@boredKitten</a></span></p>`
      );
    });

    it("should work with multiple mentions nodes", () => {
      const html =
        "<p>" +
        '<span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten">@boredKitten</span>' +
        '<span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten">@boredKitten</span>' +
        "</p>";
      const { contentHtml } = ContentService._makeContentWithMention({
        contentRaw: "@boredKitten",
        contentJson: null,
        contentHtml: html,
      });

      expect(contentHtml).toEqual(
        "<p>" +
          `<span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten"><a href="https://beb.xyz?address=0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531">@boredKitten</a></span>` +
          `<span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten"><a href="https://beb.xyz?address=0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531">@boredKitten</a></span>` +
          "</p>"
      );
    });
  });

  describe("makeContent", () => {
    it("should replace the content with appropriate cleanups", () => {
      const contentHtml =
        '<p><span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten">@boredKitten</span></p>';
      const { json, raw, html } = ContentService.makeContent({
        contentRaw: "@boredKitten",
        contentJson: {},
        contentHtml: contentHtml,
      });
      const props_1 = ContentService._makeContentWithMention({
        contentRaw: "@boredKitten",
        contentJson: {},
        contentHtml: contentHtml,
      });

      expect(html).toEqual(cleanContentHtml(props_1.contentHtml));
      expect(json).toEqual("{}");
      expect(raw).toEqual("@boredKitten");
    });
  });

  describe("makeRichContent", () => {
    it("should return content made by makeContent", async () => {
      const contentHtml =
        '<p><span data-type="mention" class="basic-editor-mention" data-id="0x2365C6f1681144b4E9dcD72C5F2Ca475677A9531" data-label="boredKitten">@boredKitten</span></p>';
      const { json, raw, html } = ContentService.makeContent({
        contentRaw: "@boredKitten",
        contentJson: {},
        contentHtml: contentHtml,
      });
      const res = await ContentService.makeRichContent({
        contentHtml,
        contentRaw: "@boredKitten",
        contentJson: {},
        blocks: [],
      });

      expect(html).toEqual(res.content.html);
      expect(json).toEqual(res.content.json);
      expect(raw).toEqual(res.content.raw);
    });

    it("should create a link block if there is a link", async () => {
      const contentHtml = '<p><a href="http://pump.com">pump.com</a></p>';

      const res = await ContentService.makeRichContent({
        contentHtml,
        contentRaw: "@boredKitten",
        contentJson: {},
        blocks: [],
      });

      expect(res.blocks.length).toEqual(1);
    });
  });
});
