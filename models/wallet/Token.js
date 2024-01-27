const { schema: tokenSchema } = require("../../schemas/wallet/token");
const mongoose = require("mongoose");

class TokenClass {
  static ping() {
    console.log("model: TokenClass");
  }
}
tokenSchema.loadClass(TokenClass);

const Token =
  mongoose.models.Token || mongoose.model("wallet.Token", tokenSchema);

module.exports = {
  Token,
};
