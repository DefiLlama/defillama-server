const abi = {
  getFlow: {
    inputs: [
      {
        internalType: "contract ISuperfluidToken",
        name: "token",
        type: "address",
      },
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "receiver", type: "address" },
    ],
    name: "getFlow",
    outputs: [
      { internalType: "uint256", name: "timestamp", type: "uint256" },
      { internalType: "int96", name: "flowRate", type: "int96" },
      { internalType: "uint256", name: "deposit", type: "uint256" },
      { internalType: "uint256", name: "owedDeposit", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
};
export default abi;
