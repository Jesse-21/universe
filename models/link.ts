import mongoose from "mongoose";
import { LinkSchema } from "../schema/main.js";

import axios from "axios";
import axiosRetry from "axios-retry";
axiosRetry(axios, { retries: 3 });

const TIMEOUT = 10000;

class LinkClass extends mongoose.Model {
  static async getHtml(targetUrl: string): Promise<string> {
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
        },
        timeout: TIMEOUT,
      });
      html = data;
    }
    return html;
  }
}

LinkSchema.loadClass(LinkClass);

export const Link = mongoose.models.Link || mongoose.model("Link", LinkSchema);
