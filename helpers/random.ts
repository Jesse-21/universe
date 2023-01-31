import crypto from "crypto";
import { ethers } from "ethers";

export const getRandomUint256 = () => {
  return ethers.BigNumber.from(crypto.randomBytes(32)).toString();
};
