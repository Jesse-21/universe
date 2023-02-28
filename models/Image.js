const mongoose = require("mongoose");
const axios = require("axios").default;
const FormData = require("form-data");
const fs = require("fs");

const { schema } = require("../schemas/richBlocks/image");
const Sentry = require("@sentry/node");

class ImageClass {
  static ping() {
    console.log("model: ImageClass");
  }

  /**
   * Upload image to Imgur
   * @returns Promise<Image>
   */
  static async uploadImage({ image }) {
    try {
      const form = new FormData();
      if (image instanceof String || typeof image === "string") {
        form.append("image", image);
      } else {
        form.append("image", fs.createReadStream(image.filepath));
        form.append("type", "file");
        form.append("name", image.newFilename);
      }

      const response = await axios.post("https://api.imgur.com/3/image", form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
        },
      });
      if (response?.data?.success) {
        const image = await Image.create({
          src: response.data.data.link,
          name: response.data.data.name,
          isVerified: false,
        });
        return image;
      } else {
        throw new Error("Imgur API error");
      }
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      throw new Error(e.message);
    }
  }
}

schema.loadClass(ImageClass);

const Image = mongoose.models.Image || mongoose.model("Image", schema);

module.exports = {
  Image,
};
