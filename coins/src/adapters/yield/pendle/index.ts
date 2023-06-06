import getTokenPrices from "./pendle";

const config: { [chain: string]: any } = {
  // ethereum: {
  //   factory: "0x27b1dacd74688af24a64bd3c9c1b143118740784",
  //   fromBlock: 16032059,
  // },
  arbitrum: {
    factory: "0xf5a7de2d276dbda3eef1b62a9e718eff4d29ddc8",
    fromBlock: 62979673,
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
