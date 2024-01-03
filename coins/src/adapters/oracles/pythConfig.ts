export const mapping: { [pythId: string]: string[] } = {
  WSTETH: ["solana:ZScHuTtqZukUrtZS43teTKGs2VqkKL8k4QCouR2n6Uo"],
};

export type Feed = {
  ticker: string;
  quote: string;
  id: string;
  keys: string[];
};

export const abi: Object = {
  inputs: [{ internalType: "bytes32", name: "id", type: "bytes32" }],
  name: "getPriceUnsafe",
  outputs: [
    {
      components: [
        { internalType: "int64", name: "price", type: "int64" },
        { internalType: "uint64", name: "conf", type: "uint64" },
        { internalType: "int32", name: "expo", type: "int32" },
        { internalType: "uint256", name: "publishTime", type: "uint256" },
      ],
      internalType: "struct PythStructs.Price",
      name: "price",
      type: "tuple",
    },
  ],
  stateMutability: "view",
  type: "function",
};
