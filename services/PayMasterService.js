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
  constructor({ apiKey, chain = "opt-goerli" }) {
    super();
    this.apiKey = apiKey;
    this.chain = chain;
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
      expiresAt: Date.now() + 1000 * 60 * 10, // 10 minute
      value: paymasterData,
    });

    return paymasterData;
  }

  /** On testnet so not needing permission/auth for now */
  handleCreateBackpackPaymaster = async ({
    id = 1, // request id to send to alchemy
    // the initial sender is the owner of the backpack, but not the counterfactual address of the backpack.
    sender,
  }) => {
    const account = await Account.findOrCreateByAddressAndChainId({
      address: sender,
      chainId: 1,
    });
    const AccountQueryService = new _AccountQueryService();
    const backpackAddress = await AccountQueryService.backpackAddress(account);
    if (!backpackAddress) {
      throw new Error("No backpack address found");
    }
    const accountNonce = await AccountNonce.findOne({
      account: account._id,
    });
    const salt = accountNonce.salt;

    const initCode = this.getInitCode({
      ownerAddress: sender,
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
  };
}

module.exports = { Service: PaymasterService };
