import mongoose from "mongoose";
import { LinkSchema } from "../schema/main.js";
import axios from "axios";
import axiosRetry from "axios-retry";
import _metascraper from "metascraper";
import metascraperDescription from "metascraper-description";
import metascraperImage from "metascraper-image";
import metascraperLogo from "metascraper-logo";
import metascraperTitle from "metascraper-title";
import metascraperUrl from "metascraper-url";
import metascraperIframe from "metascraper-iframe";
import { cleanIframeHtml } from "../helpers/html.js";
import { ILink } from "../schema/interfaces.js";

const metascraper = _metascraper([
  metascraperDescription(),
  metascraperImage(),
  metascraperLogo(),
  metascraperTitle(),
  metascraperUrl(),
  metascraperIframe(),
]);

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

  static async createRichLink({
    url: targetUrl,
    callback,
    onError,
  }: {
    url: string;
    callback?: (link: LinkClass) => Promise<LinkClass>;
    onError?: (e: Error) => void;
  }): Promise<LinkClass | null> {
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
      const html = await LinkClass.getHtml(targetUrl);
      const link = new LinkClass();
      callback?.(link); // in case we want to async scrape the link

      const {
        description,
        image,
        title,
        logo,
        url: cleanUrl,
        iframe: rawIframe,
      } = (await metascraper({
        html,
        url: targetUrl,
      })) as unknown as {
        description: string;
        image: string;
        title: string;
        logo: string;
        url: string;
        iframe: string;
      };

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
    } catch (e: unknown) {
      console.error(e);
      if (e instanceof Error) {
        onError?.(e);
      } else {
        onError?.(new Error("Unknown error"));
      }
      return null;
    }
  }
}

LinkSchema.loadClass(LinkClass);

export const Link =
  mongoose.models.Link || mongoose.model<ILink>("Link", LinkSchema);
