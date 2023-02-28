const { ethers } = require("ethers");

jest.useFakeTimers();
const { getMessageHash } = require("../get-message-hash");
const { getRandomAddress } = require("../get-random-address");
const { wallet } = require("../test-sign-wallet");

describe("Get message hash tests", () => {
  let recipientAddress = getRandomAddress();
  let amount = ethers.utils.parseUnits("0.0001", 18);
  let nonce = 1;
  let contractAddress = getRandomAddress();

  it("should decode the correct hash", async () => {
    const hash = getMessageHash(
      recipientAddress,
      amount,
      nonce,
      contractAddress
    );

    const signature = await wallet.signMessage(hash);
    let recovered = ethers.utils.verifyMessage(hash, signature);

    expect(recovered).toBe(wallet.address);
  });
});
