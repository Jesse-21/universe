const { createDb } = require("../../helpers/create-test-db");
const axios = require("axios").default;

jest.mock("axios");

const { Image } = require("../Image");

class File {
  filepath = "/";
  newFilename = "mock";
}

describe("Image tests", () => {
  let db;
  let image;

  beforeEach(() => {
    axios.post.mockReset();
    jest.clearAllMocks();
  });
  beforeAll(async () => {
    db = await createDb();
    await db.connect();
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("uploadImage", () => {
    it("should create a new image if successful", async () => {
      axios.post.mockResolvedValue({
        data: {
          data: {
            link: "https://mocklink.com/image.png",
            name: "mock",
          },
          success: true,
        },
      });
      await Image.uploadImage({ image: new File() });
      image = await Image.findOne({
        src: "https://mocklink.com/image.png",
      });
      expect(image).toBeTruthy();
    });
    it("should throw an error if API fails", async () => {
      axios.post.mockResolvedValue({
        data: { success: false },
      });
      try {
        await Image.uploadImage({ image: new File() });
      } catch (e) {
        expect(e.message).toMatch("Imgur API error");
      }
    });
  });
});
