const { Account } = require("../models/Account");
const { Service: _AlchemyService } = require("../services/AlchemyService");
const { prod } = require("./registrar");
const { requireAuth } = require("./auth-middleware");

const mustBeBEBHolder = async (token) => {
  try {
    const data = await requireAuth(token);
    const accountId = data.payload.id;
    const account = await Account.findById(accountId).populate("addresses");
    if (!account) throw new Error("Account not found");
    const address = account.addresses?.[0]?.address;
    const contractAddress = prod().REGISTRAR_ADDRESS;
    const AlchemyService = new _AlchemyService({
      apiKey: prod().NODE_URL, // force use prod for BEB collection
      chain: prod().NODE_NETWORK, // force use prod for BEB collection
    });
    const isOwner = await AlchemyService.isHolderOfCollection({
      wallet: address,
      contractAddress,
    });
    if (!isOwner)
      throw new Error(
        "Due to demand, you must own a BEB domain to use this feature. Register one for free at beb.quest and contribute to the network!"
      );
    return true;
  } catch (e) {
    throw new Error(e.message);
  }
};

module.exports = {
  mustBeBEBHolder,
};
