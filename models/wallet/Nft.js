const { schema: nftSchema } = require("../../schemas/wallet/nft");
const mongoose = require("mongoose");

class NftClass {
  static ping() {
    console.log("model: NftClass");
  }
}
nftSchema.loadClass(NftClass);

const Nft = mongoose.models.Nft || mongoose.model("wallet.Nft", nftSchema);

module.exports = {
  Nft,
};
