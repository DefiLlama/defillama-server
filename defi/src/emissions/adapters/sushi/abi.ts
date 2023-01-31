const abi = {
  token: {
    "0x1ab80f7fb46b25b7e0b2cfac23fc88ac37aaf4e9": {
      inputs: [],
      name: "cvx",
      outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    "0xc2edad668740f1aa35e4d8f227fb8e17dca888cd": {
      inputs: [],
      name: "sushi",
      outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
  },
  totalAllocPoint: {
    inputs: [],
    name: "totalAllocPoint",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  rewardPerBlock: {
    "0x1ab80f7fb46b25b7e0b2cfac23fc88ac37aaf4e9": {
      inputs: [],
      name: "rewardPerBlock",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    "0xc2edad668740f1aa35e4d8f227fb8e17dca888cd": {
      inputs: [],
      name: "sushiPerBlock",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  },
  startBlock: {
    inputs: [],
    name: "startBlock",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  endBlock: {
    "0x1ab80f7fb46b25b7e0b2cfac23fc88ac37aaf4e9": {
      inputs: [],
      name: "endBlock",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    "0xc2edad668740f1aa35e4d8f227fb8e17dca888cd": {
      inputs: [],
      name: "bonusEndBlock",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  },
  poolInfo: {
    "0x1ab80f7fb46b25b7e0b2cfac23fc88ac37aaf4e9": {
      inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      name: "poolInfo",
      outputs: [
        { internalType: "contract IERC20", name: "lpToken", type: "address" },
        { internalType: "uint256", name: "allocPoint", type: "uint256" },
        { internalType: "uint256", name: "lastRewardBlock", type: "uint256" },
        { internalType: "uint256", name: "accCvxPerShare", type: "uint256" },
        {
          internalType: "contract IRewarder",
          name: "rewarder",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    "0xc2edad668740f1aa35e4d8f227fb8e17dca888cd": {
      inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      name: "poolInfo",
      outputs: [
        { internalType: "contract IERC20", name: "lpToken", type: "address" },
        { internalType: "uint256", name: "allocPoint", type: "uint256" },
        { internalType: "uint256", name: "lastRewardBlock", type: "uint256" },
        { internalType: "uint256", name: "accSushiPerShare", type: "uint256" },
      ],
      stateMutability: "view",
      type: "function",
    },
  },
};
export default abi;
