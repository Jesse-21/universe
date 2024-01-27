const crypto = require("crypto");

/**
 * Generate a random base64 string as a challenge
 * at least 32 bytes
 * @returns String
 */
const generateChallenge = () => {
  return crypto.randomBytes(32).toString("base64");
};

module.exports = { generateChallenge };
