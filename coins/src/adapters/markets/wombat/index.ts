import getTokenPrices from "./wombat";
import getWrappedPrices from "./wombatWrapped";

const contracts: {
  [chain: string]: { [contract: string]: any };
} = {
  arbitrum: {
    masterWombat: "0xe7159f15e7b1d6045506B228A1ed2136dcc56F48",
    markets: ["0xe7159f15e7b1d6045506B228A1ed2136dcc56F48"],
  },
};

const wrapped: { [chain: string]: string[] } = {
  avax: [
    "0x960c66DDA302f4a496D936f693E083b1E9ACE306",
    "0x2ddfdd8e1bec473f07815fa3cfea3bba4d39f37e",
    "0x29eeb257a2a6ecde2984acedf80a1b687f18ec91",
    "0xc096ff2606152ed2a06dd12f15a3c0466aa5a9fa",
  ],
};

export function wombat(timestamp: number = 0) {
  return Promise.all(
    Object.keys(contracts).map((c: string) =>
      getTokenPrices(timestamp, c, contracts[c]),
    ),
  );
}

export function wombatWrapped(timestamp: number = 0) {
  return Promise.all(
    Object.keys(wrapped).map((c: string) =>
      getWrappedPrices(timestamp, c, wrapped[c]),
    ),
  );
}
