import getTokenPrices from "./pendle";
import { getPenpiePrices } from "./penpie";

const config: { [chain: string]: any } = {
  ethereum: {
    toAsset: "0x263833d47eA3fA4a30f269323aba6a107f9eB14C",
    factories: [
      {
        factory: "0x27b1dacd74688af24a64bd3c9c1b143118740784",
        fromBlock: 16032059,
        toBlock: 18969420,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor)",
        topics: [
          "0x166ae5f55615b65bbd9a2496e98d4e4d78ca15bd6127c0fe2dc27b76f6c03143",
        ],
      },
      {
        factory: "0x1A6fCc85557BC4fB7B534ed835a03EF056552D52",
        fromBlock: 18969410,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
    ],
  },
  arbitrum: {
    toAsset: "0xAdB09F65bd90d19e3148D9ccb693F3161C6DB3E8",
    factories: [
      {
        factory: "0xf5a7de2d276dbda3eef1b62a9e718eff4d29ddc8",
        fromBlock: 62979673,
        toBlock: 156987308,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor)",
        topics: [
          "0x166ae5f55615b65bbd9a2496e98d4e4d78ca15bd6127c0fe2dc27b76f6c03143",
        ],
      },
      {
        factory: "0x2FCb47B58350cD377f94d3821e7373Df60bD9Ced",
        fromBlock: 156987300,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
    ],
  },
  bsc: {
    toAsset: "0x2700ADB035F82a11899ce1D3f1BF8451c296eABb",
    factories: [
      {
        factory: "0x2bEa6BfD8fbFF45aA2a893EB3B6d85D10EFcC70E",
        fromBlock: 29484286,
        toBlock: 33884419,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor)",
        topics: [
          "0x166ae5f55615b65bbd9a2496e98d4e4d78ca15bd6127c0fe2dc27b76f6c03143",
        ],
      },
      {
        factory: "0xC40fEbF5A33b8C92B187d9be0fD3fe0ac2E4B07c",
        fromBlock: 33884419,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
    ],
  },
  optimism: {
    toAsset: "0x704478Dd72FD7F9B83d1F1e0fc18C14B54F034d0",
    factories: [
      {
        factory: "0x17F100fB4bE2707675c6439468d38249DD993d58",
        fromBlock: 108061449,
        toBlock: 112783590,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor)",
        topics: [
          "0x166ae5f55615b65bbd9a2496e98d4e4d78ca15bd6127c0fe2dc27b76f6c03143",
        ],
      },
      {
        factory: "0x4A2B38b9cBd83c86F261a4d64c243795D4d44aBC",
        fromBlock: 112783590,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
    ],
  },
};

export function pendle(timestamp: number = 0) {
  return Promise.all(
    Object.keys(config).map((chain: string) =>
      getTokenPrices(timestamp, chain, config[chain]),
    ),
  );
}

const masters: { [chain: string]: { target: string; fromBlock: number } } = {
  arbitrum: {
    target: "0x0776C06907CE6Ff3d9Dbf84bA9B3422d7225942D",
    fromBlock: 97640252,
  },
  ethereum: {
    target: "0x16296859C15289731521F199F0a5f762dF6347d0",
    fromBlock: 17406748,
  },
  bsc: {
    target: "0xb35b3d118c0394e750b4b59d2a2f9307393cd5db",
    fromBlock: 29693582,
  },
};

export async function penpie(timestamp: number = 0) {
  return Promise.all(
    Object.keys(masters).map((chain: string) =>
      getPenpiePrices(timestamp, chain, masters[chain]),
    ),
  );
}
