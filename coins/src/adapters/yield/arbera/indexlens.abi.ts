export default {
  getIndexMutableInfo: {
    inputs: [
      { internalType: "address", name: "_indexAddress", type: "address" },
    ],
    name: "getIndexMutableInfo",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "cbr", type: "uint256" },
          {
            internalType: "uint256",
            name: "feesAccumulated",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "underlying",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "minFeesToSwap",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "totalSupply",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "lpTotalSupply",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "denTokenInLP",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "pairedTokenInLP",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "partnerFee",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "totalRewards",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "totalRewardsPaired",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "rewardsToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "rewardsDistributor",
            type: "address",
          },
        ],
        internalType: "struct IndexLens.DenInfoMutable",
        name: "info_",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
} as const;
