const axios = require("axios").default;
const Sentry = require("@sentry/node");
const TIMEOUT_MS = 10_000;
const constants = require("./constants/aa");
const { Service: WalletService } = require("./WalletService");
const { Service: _CacheService } = require("./cache/CacheService");
const {
  Service: _AccountQueryService,
} = require("./queryServices/AccountQueryService");
const { Account } = require("../models/Account");
const { AccountNonce } = require("../models/AccountNonce");

class PaymasterService extends WalletService {
  constructor({ apiKey, chain = "opt-goerli", chainId = 420 }) {
    super({
      apiKey,
      chain,
      chainId,
    });
    this.apiKey = apiKey;
    this.chain = chain;
    this.chainId = chainId;
    if (this.chain === "homestead") {
      this.chain = "mainnet";
    }
  }

  getBaseRoute() {
    return `https://${this.chain}.g.alchemy.com/v2/${this.apiKey}`;
  }
  getNFTBaseRoute() {
    return `https://${this.chain}.g.alchemy.com/nft/v2/${this.apiKey}`;
  }

  async _getPaymasterAndData({
    policyId = constants.defaultPaymasterPolicyId,
    entryPoint = constants.entryPointAddress,
    dummySignature = constants.defaultPaymasterDummySignature,
    userOperation,
    id = 1, // request id to send to alchemy
  }) {
    const route = `${this.getBaseRoute()}`;

    try {
      const res = await axios.post(
        `${route}`,
        {
          id,
          jsonrpc: "2.0",
          method: "alchemy_requestGasAndPaymasterAndData",
          params: [
            {
              policyId: policyId,
              entryPoint: entryPoint,
              dummySignature: dummySignature,
              userOperation,
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: TIMEOUT_MS,
        }
      );

      if (res?.data?.error) {
        Sentry.captureException(JSON.stringify(res?.data?.error));
        throw new Error(JSON.stringify(res?.data?.error));
      }
      return res?.data.result;
    } catch (e) {
      console.log("error", e.response?.data?.error);
      Sentry.captureException(e);
      throw e;
    }
  }

  async _cachedOrGetPaymasterData({ userOperation, ...props }) {
    const CacheService = new _CacheService();
    const existing = await CacheService.get({
      key: "PaymasterService",
      params: {
        userOperation,
      },
    });
    if (existing) return existing;
    const paymasterData = await this._getPaymasterAndData({
      userOperation,
      ...props,
    });
    CacheService.set({
      key: "PaymasterService",
      params: {
        userOperation,
      },
      expiresAt: Date.now() + 1000 * 60 * 2, // 2 minutes
      value: paymasterData,
    });

    return paymasterData;
  }

  /** On testnet so not needing permission/auth for now */
  async _handleCreateBackpackPaymaster({
    id = 1, // request id to send to alchemy
    userOp = {},
    accountId,
    backpackAddress,
  }) {
    if (!backpackAddress) {
      throw new Error("No backpack address found");
    }
    const accountNonce = await AccountNonce.findOne({
      account: accountId,
    });
    const salt = accountNonce.salt;

    const initCode = this.getInitCode({
      ownerAddress: userOp.sender,
      salt,
    });

    const nonce = "0x0";
    const callData = "0x";
    const userOperation = {
      sender: backpackAddress,
      nonce,
      initCode,
      callData,
    };

    const paymasterData = await this._cachedOrGetPaymasterData({
      userOperation,
      id,
    });
    return {
      ...paymasterData,
      ...userOperation,
    };
  }

  async _handleSponsoredItemPaymaster({
    id = 1, // request id to send to alchemy
    params = [],
    backpackAddress,
  }) {
    const sponsoredLootAddress = constants.bebOnboardingLootContractAddress;

    const callData = this.getCallData({
      abi: constants.LootContractJson.abi,
      functionName: "mint",
      contractAddress: sponsoredLootAddress,
      params,
    });
    const nonce = await this.getBackpackNonce(backpackAddress);

    const userOperation = {
      sender: backpackAddress,
      nonce: nonce.toHexString(),
      initCode: "0x",
      callData,
    };

    const paymasterData = await this._cachedOrGetPaymasterData({
      userOperation,
      id,
    });
    return {
      ...paymasterData,
      ...userOperation,
    };
  }

  async handlePaymaster({ userOp, type, typeId, params = "" }) {
    if (!userOp.sender) {
      throw new Error("No sender found");
    }
    const account = await Account.findOrCreateByAddressAndChainId({
      address: userOp.sender,
      chainId: 1,
    });
    const AccountQueryService = new _AccountQueryService();
    const backpackAddress = await AccountQueryService.backpackAddress(account);

    // @TODO generate unique Ids
    try {
      if (type === "CREATE_BACKPACK") {
        return this._handleCreateBackpackPaymaster({
          userOp,
          backpackAddress,
          accountId: account?._id,
        });
      } else if (type === "SPONSORED_ITEM") {
        const paramsArray = params.split(",") || [];
        return this._handleSponsoredItemPaymaster({
          userOp,
          backpackAddress,
          params: paramsArray,
        });
      } else {
        throw new Error("Invalid type");
      }
    } catch (e) {
      Sentry.captureException(e);
      throw e;
    }
  }
}

module.exports = { Service: PaymasterService };
