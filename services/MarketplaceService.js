const ethers = require("ethers");
const axios = require("axios");
const Sentry = require("@sentry/node");
const { getProvider } = require("../helpers/alchemy-provider");
const { config } = require("../helpers/marketplace");
const {
  validateAndConvertAddress,
} = require("../helpers/validate-and-convert-address");
const { getMemcachedClient } = require("../connectmemcached");
const { Listings, ListingLogs, Fids, Offers } = require("../models/farcaster");
const {
  getFarcasterUserByFid,
  searchFarcasterUserByMatch,
} = require("../helpers/farcaster");

class MarketplaceService {
  constructor() {
    const alchemyProvider = getProvider({
      network: config().NODE_NETWORK,
      node: config().NODE_URL,
    });

    const marketplace = new ethers.Contract(
      config().FID_MARKETPLACE_V1_ADDRESS,
      config().FID_MARKETPLACE_V1_ABI,
      alchemyProvider
    );

    const idRegistry = new ethers.Contract(
      config().ID_REGISTRY_ADDRESS,
      config().ID_REGISTRY_ABI,
      alchemyProvider
    );

    this.marketplace = marketplace;
    this.idRegistry = idRegistry;
    this.alchemyProvider = alchemyProvider;

    this.usdFormatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  async ethToUsd(eth) {
    if (!eth) return "0";
    try {
      const memcached = getMemcachedClient();
      try {
        const cachedEth = await memcached.get("MarketplaceService_ethToUsd");
        if (cachedEth) {
          return ethers.BigNumber.from(cachedEth.value).mul(eth).toString();
        }
      } catch (e) {
        console.error(e);
      }
      const url = `
    https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${process.env.ETHERSCAN_API_KEY}`;

      const response = await axios.get(url);
      const data = response.data;
      const ethPrice = data.result?.ethusd;
      if (!ethPrice) {
        return "0";
      }
      try {
        await memcached.set(
          "MarketplaceService_ethToUsd",
          parseInt(ethPrice).toString(),
          {
            lifetime: 60, // 60s
          }
        );
      } catch (e) {
        console.error(e);
      }

      return ethers.BigNumber.from(parseInt(ethPrice)).mul(eth).toString();
    } catch (e) {
      console.error(e);
      Sentry.captureException(e);
      return "0";
    }
  }

  // pad number with zeros to 32 bytes for easy sorting in mongodb
  _padWithZeros(numberString) {
    const maxLength = 32;
    while (numberString.length < maxLength) {
      numberString = "0" + numberString;
    }
    return numberString;
  }

  async getBestOffer({ fid }) {
    const memcached = getMemcachedClient();
    let offer;
    try {
      const data = await memcached.get(`getBestOffer:${fid}`);
      if (data) {
        offer = new Offers(JSON.parse(data.value));
      }
    } catch (e) {
      console.error(e);
    }

    if (!offer) {
      offer = await Offers.findOne({
        canceledAt: null,
        fid,
      }).sort({ amount: -1 });

      if (offer) {
        try {
          await memcached.set(`getBestOffer:${fid}`, JSON.stringify(offer));
        } catch (e) {
          console.error(e);
        }
      }
    }
    if (!offer) return null;

    const [user, usdWei] = await Promise.all([
      this.fetchUserData(fid),
      this.ethToUsd(offer.amount),
    ]);

    const usd = this.usdFormatter.format(ethers.utils.formatEther(usdWei));

    return {
      ...JSON.parse(JSON.stringify(offer)),
      usd,
      user,
    };
  }

  async getListing({ fid }) {
    const memcached = getMemcachedClient();
    let listing;
    try {
      const data = await memcached.get(`Listing:${fid}`);
      if (data) {
        listing = new Listings(JSON.parse(data.value));
      }
    } catch (e) {
      console.error(e);
    }
    if (!listing) {
      const query = {
        fid,
        canceledAt: null,
        deadline: { $gt: Math.floor(Date.now() / 1000) },
      };
      listing = await Listings.findOne(query);
      listing = listing ? listing._doc : null;
      if (listing) {
        try {
          await memcached.set(`Listing:${fid}`, JSON.stringify(listing));
        } catch (e) {
          console.error(e);
        }
      }
    }
    if (!listing) return null;

    const [user, usdWei] = await Promise.all([
      this.fetchUserData(fid),
      this.ethToUsd(listing.minFee),
    ]);

    const usd = this.usdFormatter.format(ethers.utils.formatEther(usdWei));

    return {
      ...JSON.parse(JSON.stringify(listing)),
      usd,
      user,
    };
  }

  async fetchUserData(fid) {
    return await getFarcasterUserByFid(fid);
  }

  async fetchListing(fid) {
    return await this.getListing({ fid });
  }

  async fetchDataForFids(fidsArr) {
    return await Promise.all(
      fidsArr.map(async (fid) => {
        const [user, listing, bestOffer] = await Promise.all([
          this.fetchUserData(fid),
          this.fetchListing(fid),
          this.getBestOffer({ fid }),
        ]);
        return {
          fid,
          user,
          listing,
          bestOffer,
        };
      })
    );
  }

  async filterByUserProfile(data) {
    return data.filter((item) => item.user);
  }
  // @TODO add filters
  async getOnlyBuyNowListings({
    sort = "fid",
    limit = 20,
    cursor = "",
    filters = {},
  }) {
    const [_offset, lastId] = cursor ? cursor.split("-") : ["0", null];
    const offset = parseInt(_offset);

    const query = {
      // fid:
      //   sort === "fid"
      //     ? { $gt: offset || 0 }
      //     : { $lt: offset || Number.MAX_SAFE_INTEGER },
      id:
        sort[0] !== "-"
          ? { $lt: lastId || Number.MAX_SAFE_INTEGER }
          : { $gt: lastId || 0 },
      deadline: { $gt: Math.floor(Date.now() / 1000) },
      canceledAt: null,
    };

    const listings = await Listings.find(query)
      .limit(limit)
      .skip(offset)
      .sort(sort + " _id");

    let extraData = await Promise.all(
      listings.map(async (listing) => {
        const [user, usdWei] = await Promise.all([
          this.fetchUserData(listing.fid),
          this.ethToUsd(listing.minFee),
        ]);

        const usd = this.usdFormatter.format(ethers.utils.formatEther(usdWei));
        return {
          fid: listing.fid,
          user,
          listing: {
            ...listing._doc,
            usd,
            user,
          },
        };
      })
    );

    let next = null;
    if (extraData.length >= limit) {
      const lastId = extraData[extraData.length - 1].listing._id;
      next = `${offset + extraData.length}-${lastId.toString()}`;
    }

    return [extraData.slice(0, limit), next];
  }
  async latestFid() {
    const memcached = getMemcachedClient();
    let count;
    try {
      const data = await memcached.get(`MarketplaceService:latestFid`);
      if (data) {
        count = data.value;
      }
    } catch (e) {
      console.error(e);
    }
    if (!count) {
      count = await Fids.countDocuments();
      try {
        await memcached.set(`MarketplaceService:latestFid`, count);
      } catch (e) {
        console.error(e);
      }
    }
    console.log("latestFid", count);
    return count;
  }

  async searchListings({
    sort = "fid",
    limit = 20,
    cursor = "",
    filters = {},
  }) {
    // @TODO add sort and cursor
    const users = await searchFarcasterUserByMatch(
      filters.query,
      limit,
      "value"
    );

    const extraData = await Promise.all(
      users.map(async (user) => {
        const listing = await this.fetchListing(user.fid);
        return {
          fid: user.fid,
          user,
          listing,
        };
      })
    );
    return [extraData, null];
  }

  async getListingsDsc({
    sort = "fid",
    limit = 20,
    cursor = "",
    filters = {},
  }) {
    const [offset, lastId] = cursor
      ? cursor.split("-")
      : [await this.latestFid(), null];
    let startsAt = parseInt(offset);
    let endAt = startsAt - parseInt(limit);

    let fidsArr = [];
    for (let i = startsAt; i > endAt; i--) {
      fidsArr.push(i.toString());
    }

    let extraData = await this.fetchDataForFids(fidsArr);

    let next = null;
    if (extraData.length >= limit) {
      const lastFid = ethers.BigNumber.from(
        extraData[extraData.length - 1].fid
      );
      next = `${lastFid.sub(1).toString()}-${lastFid.sub(1).toString()}`;
    }

    return [extraData.slice(0, limit), next];
  }

  async getListings({ sort = "fid", limit = 20, cursor = "", filters = {} }) {
    if (filters.query) {
      // filter by searching users
      return await this.searchListings({
        sort,
        limit,
        cursor,
        filters,
      });
    } else if (
      sort === "minFee" ||
      sort === "-minFee" ||
      sort === "updatedAt" ||
      sort === "-updatedAt" ||
      filters.onlyListing
    ) {
      return await this.getOnlyBuyNowListings({
        sort,
        limit,
        cursor,
        filters,
      });
    } else if (sort === "-fid") {
      return await this.getListingsDsc({
        sort,
        limit,
        cursor,
        filters,
      });
    }
    const [offset, lastId] = cursor ? cursor.split("-") : ["1", null];
    let startsAt = parseInt(offset);
    let endAt = startsAt + parseInt(limit);

    let fidsArr = [];
    for (let i = startsAt; i < endAt; i++) {
      fidsArr.push(i.toString());
    }

    let extraData = await this.fetchDataForFids(fidsArr);

    let next = null;
    if (extraData.length >= limit) {
      const lastFid = ethers.BigNumber.from(
        extraData[extraData.length - 1].fid
      );
      next = `${lastFid.add(1).toString()}-${lastFid.add(1).toString()}`;
    }

    return [extraData.slice(0, limit), next];
  }

  /**
   * Get proxy marketplace address
   * @returns {Promise<string>} - address of owner
   */
  async getProxyAddress({ address, salt }) {
    if (!address || !salt) return null;

    try {
      const memcached = getMemcachedClient();
      let proxyAddress;
      try {
        const data = await memcached.get(
          `MarketplaceService:getProxyAddress:${address}:${salt}`
        );
        if (data) {
          proxyAddress = JSON.parse(data.value);
        }
      } catch (e) {
        console.error(e);
      }
      if (proxyAddress) return proxyAddress;
      proxyAddress = await this.marketplace.getAddress(
        validateAndConvertAddress(address),
        salt
      );
      await memcached.set(
        `MarketplaceService:getProxyAddress:${address}:${salt}`,
        JSON.stringify(proxyAddress)
      );
      return proxyAddress;
    } catch (e) {
      Sentry.captureException(e);
      return null;
    }
  }
  async getTransactionArguments({ txHash }) {
    const transaction = await this.alchemyProvider.getTransaction(
      txHash.toString()
    );
    if (!transaction) {
      throw new Error("Transaction not found");
    }
    const eventInterface = new ethers.utils.Interface(
      config().FID_MARKETPLACE_V1_ABI
    );

    const decodedInput = eventInterface.parseTransaction({
      data: transaction.data,
      value: transaction.value,
    });

    return {
      functionName: decodedInput.name,
      args: decodedInput.args,
    };
  }

  async getReceipt({ txHash }) {
    let tries = 0;
    let receipt;

    while (tries < 120) {
      tries += 1;
      await new Promise((r) => setTimeout(r, 1000));

      receipt = await this.alchemyProvider.getTransactionReceipt(
        txHash.toString()
      );
      if (receipt) break;
    }
    if (tries >= 120) throw new Error("Timeout");
    return receipt;
  }

  async getBlockTimestamp(blockNumber) {
    const block = await this.alchemyProvider.getBlock(blockNumber);
    return new Date(block.timestamp * 1000); // Convert to JavaScript Date object
  }

  async cancelListing({ txHash }) {
    if (!txHash) {
      throw new Error("Missing txHash");
    }
    const existing = await ListingLogs.findOne({ txHash });
    if (existing) {
      return await Listings.findOne({ fid: existing.fid });
    }
    const receipt = await this.getReceipt({ txHash });
    if (!receipt) {
      throw new Error("Transaction not found");
    }
    const eventInterface = new ethers.utils.Interface(
      config().FID_MARKETPLACE_V1_ABI
    );
    let updatedListing = null;
    for (let log of receipt.logs) {
      try {
        const parsed = eventInterface.parseLog(log);
        const fid = parsed.args.fid.toNumber();

        const query = {
          fid,
        };

        if (parsed.name === "Canceled") {
          updatedListing = await Listings.findOneAndUpdate(
            query,
            {
              txHash,
              canceledAt: new Date(),
            },
            {
              new: true,
            }
          );

          await ListingLogs.updateOne(
            {
              txHash,
            },
            {
              eventType: "Canceled",
              fid: fid,
              txHash,
            },
            {
              upsert: true,
            }
          );

          const memcached = getMemcachedClient();
          try {
            await memcached.delete(`Listing:${fid}`, {
              noreply: true,
            });
          } catch (e) {
            console.error(e);
          }
          break;
        }
      } catch (error) {
        // Log could not be parsed; continue to next log
        throw new Error("Cannot cancel listing, try again later");
      }
    }
    if (!updatedListing) {
      throw new Error("FID not listed");
    }
    return updatedListing;
  }

  async getStats() {
    try {
      const memcached = getMemcachedClient();
      let stats;

      try {
        const data = await memcached.get("MarketplaceService:getStats");
        if (data) {
          stats = JSON.parse(data.value);
        }
      } catch (e) {
        console.error(e);
      }

      if (!stats) {
        const [
          floorListing,
          highestOffer,
          highestSaleRaw,
          totalVolumeRaw,
          oneEthToUsd,
        ] = await Promise.all([
          Listings.findOne({ canceledAt: null }).sort({ minFee: 1 }),
          Offers.findOne({ canceledAt: null }).sort({ amount: -1 }),
          memcached.get("MarketplaceService:stats:highestSale"),
          memcached.get("MarketplaceService:stats:totalVolume"),
          this.ethToUsd(1),
        ]);

        const highestSale = highestSaleRaw?.value || "0";
        const totalVolume = totalVolumeRaw?.value || "0";

        stats = {
          stats: {
            floor: {
              usd: this.usdFormatter.format(
                ethers.utils.formatEther(
                  ethers.BigNumber.from(floorListing.minFee).mul(oneEthToUsd)
                )
              ),
              wei: floorListing.minFee,
            },
            highestOffer: {
              usd: this.usdFormatter.format(
                ethers.utils.formatEther(
                  ethers.BigNumber.from(highestOffer?.amount || "0").mul(
                    oneEthToUsd
                  )
                )
              ),
              wei: highestOffer?.amount || "0",
            },
            highestSale: {
              usd: this.usdFormatter.format(
                ethers.utils.formatEther(
                  ethers.BigNumber.from(highestSale).mul(oneEthToUsd)
                )
              ),
              wei: highestSale,
            },
            totalVolume: {
              usd: this.usdFormatter.format(
                ethers.utils.formatEther(
                  ethers.BigNumber.from(totalVolume).mul(oneEthToUsd)
                )
              ),
              wei: totalVolume,
            },
          },
          success: true,
        };

        try {
          await memcached.set(
            "MarketplaceService:getStats",
            JSON.stringify(stats)
          );
        } catch (e) {
          console.error(e);
        }
      }

      return stats;
    } catch (e) {
      console.log(e);
      Sentry.captureException(e);
      // skip
      return {
        success: false,
        stats: {},
      };
    }
  }

  async computeStats({ txHash }) {
    const receipt = await this.getReceipt({ txHash });
    const eventInterface = new ethers.utils.Interface(
      config().FID_MARKETPLACE_V1_ABI
    );

    const memcached = getMemcachedClient();

    for (let log of receipt.logs) {
      try {
        const parsed = eventInterface.parseLog(log);
        if (parsed.name === "Listed") {
          try {
            const lastFloorRaw = await memcached.get(
              "MarketplaceService:stats:floor"
            );
            const lastFloor = lastFloorRaw?.value;
            const newFloor = lastFloor
              ? ethers.BigNumber.from(parsed.args.amount).lt(
                  ethers.BigNumber.from(lastFloor)
                )
                ? parsed.args.amount.toString()
                : lastFloor
              : parsed.args.amount.toString();

            await memcached.set("MarketplaceService:stats:floor", newFloor);
          } catch (e) {
            console.error(e);
          }
          break;
        } else if (parsed.name === "Bought") {
          try {
            const [highestSaleRaw, totalVolumeRaw] = await Promise.all([
              memcached.get("MarketplaceService:stats:highestSale"),
              memcached.get("MarketplaceService:stats:totalVolume"),
            ]);
            const highestSale = highestSaleRaw?.value;
            const totalVolume = totalVolumeRaw?.value;

            const saleAmount = parsed.args.amount.toString();

            if (
              !highestSale ||
              ethers.BigNumber.from(saleAmount).gt(
                ethers.BigNumber.from(highestSale)
              )
            ) {
              await memcached.set(
                "MarketplaceService:stats:highestSale",
                saleAmount
              );
            }

            const newTotalVolume = totalVolume
              ? ethers.BigNumber.from(totalVolume)
                  .add(ethers.BigNumber.from(saleAmount))
                  .toString()
              : saleAmount;

            await memcached.set(
              "MarketplaceService:stats:totalVolume",
              newTotalVolume
            );
            await memcached.delete("MarketplaceService:getStats", {
              noreply: true,
            });
          } catch (e) {
            console.error(e);
          }
          break;
        }
      } catch (error) {
        // Log could not be parsed; continue to next log
      }
    }
  }

  async list({ txHash }) {
    if (!txHash) throw new Error("Missing txHash");
    const existing = await ListingLogs.findOne({ txHash });
    if (existing) {
      return await Listings.findOne({ fid: existing.fid });
    }

    const receipt = await this.getReceipt({ txHash });
    if (!receipt) {
      throw new Error("Transaction not found");
    }

    const eventInterface = new ethers.utils.Interface(
      config().FID_MARKETPLACE_V1_ABI
    );

    let updatedListing = null;
    for (let log of receipt.logs) {
      try {
        const parsed = eventInterface.parseLog(log);

        const fid = parsed.args.fid.toNumber();

        const query = {
          fid,
        };

        if (parsed.name === "Listed") {
          updatedListing = await Listings.findOneAndUpdate(
            query,
            {
              ownerAddress: parsed.args.owner,
              minFee: this._padWithZeros(parsed.args.amount.toString()),
              deadline: parsed.args.deadline,
              txHash, // the latest txHash
              canceledAt: null,
            },
            { upsert: true, new: true }
          );

          await ListingLogs.updateOne(
            {
              txHash,
            },
            {
              eventType: "Listed",
              fid: fid,
              from: parsed.args.owner,
              price: this._padWithZeros(parsed.args.amount.toString()),
              txHash,
            },
            {
              upsert: true,
            }
          );

          const memcached = getMemcachedClient();
          try {
            await memcached.set(
              `Listing:${fid}`,
              JSON.stringify(updatedListing)
            );
          } catch (e) {
            console.error(e);
          }

          break;
        }
      } catch (error) {
        // Log could not be parsed; continue to next log
      }
    }
    if (!updatedListing) {
      throw new Error("FID not listed");
    }
    this.computeStats({ txHash });
    return updatedListing;
  }

  async buy({ txHash }) {
    if (!txHash) throw new Error("Missing txHash");
    const existing = await ListingLogs.findOne({ txHash });
    if (existing) {
      return await Listings.findOne({ fid: existing.fid });
    }

    const receipt = await this.getReceipt({ txHash });
    if (!receipt) {
      throw new Error("Transaction not found");
    }

    const eventInterface = new ethers.utils.Interface(
      config().FID_MARKETPLACE_V1_ABI
    );

    let updatedListing = null;
    for (let log of receipt.logs) {
      try {
        const parsed = eventInterface.parseLog(log);

        if (parsed.name === "Bought") {
          const fid = parsed.args.fid.toNumber();

          const query = {
            fid,
          };

          updatedListing = await Listings.findOneAndUpdate(
            query,
            {
              txHash,
              canceledAt: new Date(),
            },
            { upsert: true, new: true }
          );

          await ListingLogs.updateOne(
            {
              txHash,
            },
            {
              eventType: "Bought",
              fid: fid,
              from: parsed.args.buyer,
              price: this._padWithZeros(parsed.args.amount.toString()),
              txHash,
            },
            {
              upsert: true,
            }
          );
          const memcached = getMemcachedClient();
          try {
            await memcached.set(
              `Listing:${parsed.args.fid}`,
              JSON.stringify(updatedListing)
            );
          } catch (e) {
            console.error(e);
          }
          break;
        }
      } catch (error) {
        // Log could not be parsed; continue to next log
      }
    }
    if (!updatedListing) {
      throw new Error("FID not bought");
    }
    this.computeStats({ txHash });
    return updatedListing;
  }

  async offer({ txHash }) {
    if (!txHash) throw new Error("Missing txHash");
    const existing = await ListingLogs.findOne({ txHash });
    if (existing) {
      return await Offers.findOne({ txHash });
    }

    const receipt = await this.getReceipt({ txHash });
    if (!receipt) {
      throw new Error("Transaction not found");
    }

    const eventInterface = new ethers.utils.Interface(
      config().FID_MARKETPLACE_V1_ABI
    );

    let updatedOffer = null;

    for (let log of receipt.logs) {
      try {
        const parsed = eventInterface.parseLog(log);

        if (parsed.name === "OfferMade") {
          const fid = parsed.args.fid.toString();

          const query = {
            fid,
            buyerAddress: parsed.args.buyer,
          };

          updatedOffer = await Offers.findOneAndUpdate(
            query,
            {
              fid,
              txHash,
              buyerAddress: parsed.args.buyer,
              amount: this._padWithZeros(parsed.args.amount.toString()),
              deadline: parsed.args.deadline,
            },
            { upsert: true, new: true }
          );

          await ListingLogs.updateOne(
            {
              txHash,
            },
            {
              eventType: "OfferMade",
              fid: fid,
              from: parsed.args.buyer,
              price: this._padWithZeros(parsed.args.amount.toString()),
              txHash,
            },
            {
              upsert: true,
            }
          );
          const memcached = getMemcachedClient();
          try {
            await memcached.delete(`getBestOffer:${parsed.args.fid}`, {
              noreply: true,
            });
          } catch (e) {
            console.error(e);
          }
          break;
        }
      } catch (error) {
        // Log could not be parsed; continue to next log
      }
    }
    if (!updatedOffer) {
      throw new Error("FID not offered");
    }
    this.computeStats({ txHash });
    return updatedOffer;
  }

  async cancelOffer({ txHash }) {
    if (!txHash) throw new Error("Missing txHash");
    const existing = await ListingLogs.findOne({ txHash });
    if (existing) {
      return await Offers.findOne({ txHash });
    }

    const receipt = await this.getReceipt({ txHash });
    if (!receipt) {
      throw new Error("Transaction not found");
    }

    const eventInterface = new ethers.utils.Interface(
      config().FID_MARKETPLACE_V1_ABI
    );

    let updatedOffer = null;
    for (let log of receipt.logs) {
      try {
        const parsed = eventInterface.parseLog(log);

        if (parsed.name === "OfferCanceled") {
          const fid = parsed.args.fid.toNumber();

          const query = {
            fid,
            buyerAddress: parsed.args.buyer,
          };

          updatedOffer = await Offers.findOneAndUpdate(
            query,
            {
              fid,
              txHash,
              canceledAt: new Date(),
            },
            { upsert: true, new: true }
          );

          await ListingLogs.updateOne(
            {
              txHash,
            },
            {
              eventType: "OfferCanceled",
              fid: fid,
              from: parsed.args.buyer,
              txHash,
            },
            {
              upsert: true,
            }
          );
          const memcached = getMemcachedClient();
          try {
            await memcached.delete(`getBestOffer:${parsed.args.fid}`, {
              noreply: true,
            });
          } catch (e) {
            console.error(e);
          }
          break;
        }
      } catch (error) {
        // Log could not be parsed; continue to next log
      }
    }
    if (!updatedOffer) {
      throw new Error("FID offer not canceled");
    }
    this.computeStats({ txHash });
    return updatedOffer;
  }

  async approveOffer({ txHash }) {
    if (!txHash) throw new Error("Missing txHash");
    const existing = await ListingLogs.findOne({ txHash });
    if (existing) {
      return await Offers.findOne({ txHash });
    }

    const receipt = await this.getReceipt({ txHash });
    if (!receipt) {
      throw new Error("Transaction not found");
    }

    const eventInterface = new ethers.utils.Interface(
      config().FID_MARKETPLACE_V1_ABI
    );

    let updatedOffer = null;
    for (let log of receipt.logs) {
      try {
        const parsed = eventInterface.parseLog(log);

        if (parsed.name === "OfferApproved") {
          const fid = parsed.args.fid.toNumber();

          const query = {
            fid,
            buyerAddress: parsed.args.buyer,
          };

          updatedOffer = await Offers.findOneAndUpdate(
            query,
            {
              txHash,
              canceledAt: new Date(),
            },
            { upsert: true, new: true }
          );

          await Listings.updateOne(
            {
              fid,
              canceledAt: null,
            },
            {
              canceledAt: new Date(),
            }
          );

          await ListingLogs.updateOne(
            {
              txHash,
            },
            {
              eventType: "OfferApproved",
              fid: fid,
              from: parsed.args.buyer,
              price: updatedOffer.amount,
              txHash,
            },
            {
              upsert: true,
            }
          );

          await ListingLogs.updateOne(
            {
              txHash,
            },
            {
              eventType: "Canceled",
              fid: fid,
              txHash,
            },
            {
              upsert: true,
            }
          );
          const memcached = getMemcachedClient();
          try {
            await memcached.delete(`getBestOffer:${parsed.args.fid}`, {
              noreply: true,
            });

            await memcached.delete(`Listing:${fid}`, {
              noreply: true,
            });
          } catch (e) {
            console.error(e);
          }
          break;
        }
      } catch (error) {
        // Log could not be parsed; continue to next log
      }
    }
    if (!updatedOffer) {
      throw new Error("FID offer not canceled");
    }
    this.computeStats({ txHash });
    return updatedOffer;
  }

  async getActivities({ eventType, fid, from, limit = 20, cursor }) {
    const [offset, lastId] = cursor ? cursor.split("-") : [Date.now(), null];

    const query = {
      createdAt: { $lt: offset },
      id: { $lt: lastId || Number.MAX_SAFE_INTEGER },
    };

    if (eventType && eventType !== "all") {
      query.eventType = eventType;
      if (eventType === "Bought") {
        query.eventType = {
          $in: ["Bought", "OfferApproved"],
        };
      }
    }
    if (fid) {
      query.fid = fid;
    }
    if (from) {
      query.from = from;
    }

    const activities = await ListingLogs.find(query)
      .limit(limit)
      .sort({ createdAt: -1 });
    const decorated = await Promise.all(
      activities.map(async (a) => {
        const [user, usdWei] = await Promise.all([
          this.fetchUserData(a.fid),
          this.ethToUsd(a.price),
        ]);

        const usd = this.usdFormatter.format(ethers.utils.formatEther(usdWei));

        return {
          ...a._doc,
          usd,
          user,
        };
      })
    );

    let next = null;
    if (activities.length === limit) {
      next = `${activities[activities.length - 1].createdAt.getTime()}-${
        activities[activities.length - 1].id
      }`;
    }

    return [decorated, next];
  }

  async getOffers({ fid, buyerAddress }) {
    const query = {
      canceledAt: null,
    };
    if (fid) {
      try {
        const cleanFid = parseInt(fid, 10);
        query.fid = isNaN(cleanFid) ? null : cleanFid;
      } catch (e) {
        // skip
      }
    }
    if (buyerAddress) {
      query.buyerAddress = buyerAddress;
    }
    const offers = await Offers.find(query).sort({ createdAt: -1 });
    const decorated = await Promise.all(
      (offers || []).map(async (offer) => {
        const [user, usdWei] = await Promise.all([
          this.fetchUserData(offer.fid),
          this.ethToUsd(offer.amount),
        ]);

        const usd = this.usdFormatter.format(ethers.utils.formatEther(usdWei));

        return {
          ...offer._doc,
          usd,
          user,
        };
      })
    );
    return decorated;
  }
  async getOffer({ fid, buyerAddress }) {
    if (!fid || !buyerAddress) {
      throw new Error("Missing fid or buyerAddress");
    }
    const query = {
      canceledAt: null,
      fid,
      buyerAddress,
    };

    const offer = await Offers.findOne(query);
    return offer;
  }
}

module.exports = { Service: MarketplaceService };
