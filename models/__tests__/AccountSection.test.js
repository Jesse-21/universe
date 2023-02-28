const { createDb } = require("../../helpers/create-test-db");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Account } = require("../Account");
const { Image } = require("../Image");
const { AccountSection } = require("../AccountSection");

describe("AccountSection tests", () => {
  let db;
  let account;
  let accountSection;

  const mockAddress = getRandomAddress();
  const mockChainId = 1;
  const mockTitle = "Experiences";

  beforeEach(() => jest.clearAllMocks());
  beforeAll(async () => {
    db = await createDb();
    await db.connect();
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("addDefaultToAccount", () => {
    it("should not create if account exists", async () => {
      account = await Account.createFromAddress({
        address: mockAddress,
        chainId: mockChainId,
        email: "foo@bar.com",
      });
      try {
        accountSection = await AccountSection.addDefaultToAccount({
          title: mockTitle,
          accountId: null,
        });
      } catch (e) {
        expect(e.message).toMatch("Invalid Account Id");
        expect(accountSection).toBeFalsy();
      }
    });
    it("should create a default section if account exists", async () => {
      accountSection = await AccountSection.addDefaultToAccount({
        title: mockTitle,
        accountId: account._id,
      });
      account = await Account.findById(account._id);
      expect(account.sections.length).toBeGreaterThanOrEqual(1);
      expect(account.sections).toEqual(
        expect.arrayContaining([accountSection._id])
      );
    });

    it("should include default entry if includeDefaultEntry is set to true", async () => {
      accountSection = await AccountSection.addDefaultToAccount({
        title: mockTitle,
        accountId: account._id,
        includeDefaultEntry: true,
      });
      account = await Account.findById(account._id);

      expect(accountSection.entries[0].title).toEqual("New entry");
    });
  });

  describe("updateMe", () => {
    it("should update properties that are not undefined", async () => {
      accountSection = await accountSection.updateMe({
        isVisible: true,
        title: undefined,
      });
      expect(accountSection.isVisible).toEqual(true);
      expect(accountSection.title).toEqual(mockTitle);
    });
  });

  describe("updateEntry", () => {
    it("should throw an error if entry does not exist", async () => {
      try {
        await accountSection.updateEntry(accountSection._id);
      } catch (e) {
        expect(e.message).toMatch("Invalid entry");
      }
    });

    it("should throw an error if image does not exist", async () => {
      try {
        await accountSection.updateEntry(accountSection.entries[0]._id, {
          imageId: accountSection._id,
        });
      } catch (e) {
        expect(e.message).toMatch("Invalid Image Id");
      }
    });

    it("should update the entry accordingly", async () => {
      const image = await Image.create({});
      accountSection = await accountSection.updateEntry(
        accountSection.entries[0]._id,
        {
          imageId: image._id,
          title: undefined,
          link: "https://beb.xyz",
        }
      );
      expect(accountSection.entries[0].image).toEqual(image._id);
      expect(accountSection.entries[0].title).toEqual("New entry");
      expect(accountSection.entries[0].link).toEqual("https://beb.xyz");
    });
  });

  describe("addDefauEntry", () => {
    it("should add a default entry", async () => {
      accountSection = await accountSection.addDefauEntry();
      accountSection = await accountSection.addDefauEntry();
      accountSection = await accountSection.addDefauEntry();
      expect(accountSection.entries.length).toBeGreaterThanOrEqual(3);
      expect(
        accountSection.entries[accountSection.entries.length - 1].title
      ).toEqual("New entry");
    });
  });

  describe("deleteEntry", () => {
    it("should delete the entry", async () => {
      const ids = accountSection.entries.map((e) => e._id);
      for (let id of ids) {
        accountSection = await accountSection.deleteEntry(id);
      }
      expect(accountSection.entries.length).toBe(0);
    });
  });

  describe("deleteMe", () => {
    it("delete the section and remove it from the account", async () => {
      const { _id, account: accountId } = accountSection;
      const accountSectionId = await accountSection.deleteMe();
      account = await Account.findById(accountId);
      const nonExisting = await AccountSection.findById(_id);

      expect(accountSectionId).toEqual(_id);
      expect(nonExisting).toBeFalsy();
      expect(account.sections).not.toEqual(expect.arrayContaining([_id]));
    });
  });
});
