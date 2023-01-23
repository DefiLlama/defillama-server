const abi = {
  start_time: {
    name: "start_time",
    outputs: [{ type: "uint256", name: "" }],
    inputs: [],
    stateMutability: "view",
    type: "function",
  },
  end_time: {
    name: "end_time",
    outputs: [{ type: "uint256", name: "" }],
    inputs: [],
    stateMutability: "view",
    type: "function",
  },
  token: {
    name: "token",
    outputs: [{ type: "address", name: "" }],
    inputs: [],
    stateMutability: "view",
    type: "function",
  },
  initial_locked_supply: {
    name: "initial_locked_supply",
    outputs: [{ type: "uint256", name: "" }],
    inputs: [],
    stateMutability: "view",
    type: "function",
  },
  mintable_in_timeframe: {
    name: "mintable_in_timeframe",
    outputs: [{ type: "uint256", name: "" }],
    inputs: [
      { type: "uint256", name: "start" },
      { type: "uint256", name: "end" },
    ],
    stateMutability: "view",
    type: "function",
  },
};
export default abi;
