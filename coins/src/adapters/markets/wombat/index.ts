import getTokenPrices from "./wombat";

const contracts: {
  [chain: string]: { [contract: string]: any };
} = {
  arbitrum: {
    masterWombat: "0xe7159f15e7b1d6045506B228A1ed2136dcc56F48",
    markets: ["0xe7159f15e7b1d6045506B228A1ed2136dcc56F48"],
  },
};

export function wombat(timestamp: number = 0) {
  return Promise.all(
    Object.keys(contracts).map((c: string) =>
      getTokenPrices(timestamp, c, contracts[c]),
    ),
  );
}
