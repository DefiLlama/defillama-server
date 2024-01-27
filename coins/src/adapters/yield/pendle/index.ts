import getTokenPrices from "./pendle";

const config: { [chain: string]: any } = {
  ethereum: {
    factory: "0x27b1dacd74688af24a64bd3c9c1b143118740784",
    fromBlock: 16032059,
    toAsset: "0x263833d47eA3fA4a30f269323aba6a107f9eB14C",
    v2Factory: "0x1a6fcc85557bc4fb7b534ed835a03ef056552d52"
  },
  arbitrum: {
    factory: "0xf5a7de2d276dbda3eef1b62a9e718eff4d29ddc8",
    fromBlock: 62979673,
    toAsset: "0xAdB09F65bd90d19e3148D9ccb693F3161C6DB3E8",
  },
  bsc: {
    factory: "0x2bEa6BfD8fbFF45aA2a893EB3B6d85D10EFcC70E",
    fromBlock: 29484286,
    toAsset: "0x2700ADB035F82a11899ce1D3f1BF8451c296eABb",
  },
  optimism: {
    factory: "0x17F100fB4bE2707675c6439468d38249DD993d58",
    fromBlock: 108061449,
    toAsset: "0x704478Dd72FD7F9B83d1F1e0fc18C14B54F034d0",
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