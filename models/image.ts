import mongoose from "mongoose";
import { ImageSchema } from "../schema/main.js";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import { IImage } from "../schema/interfaces.js";

class ImageClass extends mongoose.Model {
  static async uploadImage({
    image,
  }: {
    image: string | { filepath: string; newFilename: string };
  }) {
    if (!process.env.IMGUR_CLIENT_ID) {
      throw new Error("IMGUR_CLIENT_ID not set");
    }
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
    } catch (e: unknown) {
      console.error(e);
      if (e instanceof Error) {
        throw Error(e.message);
      } else {
        throw Error("Imgur API error");
      }
    }
  }
}

ImageSchema.loadClass(ImageClass);

export const Image =
  mongoose.models.Image || mongoose.model<IImage>("Image", ImageSchema);
