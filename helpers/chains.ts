export const chainTable = new Map<number, string>([[1, "Ethereum Mainnet"]]);

export const getNameFromChainId = (chainId: number) => {
  return chainTable.get(chainId);
};
