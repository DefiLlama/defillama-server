const abi = {
  amount: {
    inputs: [],
    name: "STANDARD_AMOUNT_UNLOCKED_AT_EACH_UNLOCK",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  steps: {
    inputs: [],
    name: "NUMBER_UNLOCK_PERIODS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  start: {
    inputs: [],
    name: "START_BLOCK",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  stepLength: {
    inputs: [],
    name: "VESTING_BETWEEN_PERIODS_IN_BLOCKS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  token: {
    inputs: [],
    name: "",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  reciever: {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
};

export default abi;
