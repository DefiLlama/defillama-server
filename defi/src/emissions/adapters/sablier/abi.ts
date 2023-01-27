const abi = {
  nextStreamId: {
    constant: true,
    inputs: [],
    name: "nextStreamId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  getStream: {
    constant: true,
    inputs: [{ internalType: "uint256", name: "streamId", type: "uint256" }],
    name: "getStream",
    outputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "deposit", type: "uint256" },
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "uint256", name: "startTime", type: "uint256" },
      { internalType: "uint256", name: "stopTime", type: "uint256" },
      { internalType: "uint256", name: "remainingBalance", type: "uint256" },
      { internalType: "uint256", name: "ratePerSecond", type: "uint256" },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
};
export default abi;
