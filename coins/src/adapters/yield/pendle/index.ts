import getTokenPrices from "./pendle";

const config: { [chain: string]: any } = {
  ethereum: {
    factory: "0x27b1dacd74688af24a64bd3c9c1b143118740784",
    fromBlock: 16032059,
    toAsset: "0xa4dbd79ad8a4befbbef799ed772ce3c58b5238d7",
  },
  arbitrum: {
    factory: "0xf5a7de2d276dbda3eef1b62a9e718eff4d29ddc8",
    fromBlock: 62979673,
    toAsset: "0x6131CA76529250679cF9e2A3b07b135f20aAb01A",
  },
};

export function pendle(timestamp: number = 0) {
  console.log("starting pendle");
  return Promise.all(
    Object.keys(config).map((chain: string) =>
      getTokenPrices(timestamp, chain, config[chain]),
    ),
  );
}
