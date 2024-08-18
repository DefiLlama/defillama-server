import getTokenPrices from "./pendle";
import { getPenpiePrices } from "./penpie";

const config: { [chain: string]: any } = {
  ethereum: {
    toAsset: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
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
      {
        factory: "0x3d75Bd20C983edb5fD218A1b7e0024F1056c7A2F",
        fromBlock: 20323253,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
    ],
  },
  arbitrum: {
    toAsset: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
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
      {
        factory: "0xd9f5e9589016da862D2aBcE980A5A5B99A94f3E8",
        fromBlock: 233004891,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
    ],
  },
  bsc: {
    toAsset: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
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
      {
        factory: "0x7D20e644D2A9e149e5be9bE9aD2aB243a7835d37",
        fromBlock: 40539593,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
    ],
  },
  optimism: {
    toAsset: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
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
      {
        factory: "0x73Be47237F12F36203823BAc9A4d80dC798B7015",
        fromBlock: 122792017,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
    ],
  },
  mantle: {
    toAsset: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
    factories: [
      {
        factory: "0xD228EC1f7D4313fe321fab511A872475D07F5bA6",
        fromBlock: 61902860,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
      {
        factory: "0xCa274A44a52241c1a8EFb9f84Bf492D8363929FC",
        fromBlock: 66526601,
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
