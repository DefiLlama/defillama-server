import { getApiPrices } from "./api";
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
        toBlock: 20323260,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
      {
        factory: "0x3d75Bd20C983edb5fD218A1b7e0024F1056c7A2F",
        fromBlock: 20323253,
        toBlock: 20512280,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
      {
        factory: "0x6fcf753f2C67b83f7B09746Bbc4FA0047b35D050",
        fromBlock: 20512270,
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
        toBlock: 233004900,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
      {
        factory: "0xd9f5e9589016da862D2aBcE980A5A5B99A94f3E8",
        fromBlock: 233004891,
        toBlock: 242036000,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
      {
        factory: "0xd29e76c6F15ada0150D10A1D3f45aCCD2098283B",
        fromBlock: 242035990,
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
        toBlock: 40539600,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
      {
        factory: "0x7D20e644D2A9e149e5be9bE9aD2aB243a7835d37",
        fromBlock: 40539593,
        toBlock: 41294180,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
      {
        factory: "0x7C7f73f7a320364DBB3C9aAa9bCcd402040EE0f9",
        fromBlock: 41294170,
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
        toBlock: 122792020,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
      {
        factory: "0x73Be47237F12F36203823BAc9A4d80dC798B7015",
        fromBlock: 122792017,
        toBlock: 123998320,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
      {
        factory: "0x02Adf72d5D06a9C92136562Eb237C07696833a84",
        fromBlock: 123998310,
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
        toBlock: 66526610,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
      {
        factory: "0xCa274A44a52241c1a8EFb9f84Bf492D8363929FC",
        fromBlock: 66526601,
        toBlock: 67661740,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
      {
        factory: "0xcb02435716b0143D4Ac1BDf370302D619E714126",
        fromBlock: 67661730,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
    ],
  },
  sonic: {
    toAsset: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
    factories: [
      {
        factory: "0xFeE31A6eC6eBefa0b5A594Bf5b1139e3c6fAA0fB",
        fromBlock: 7830440,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
    ],
  },
  base: {
    toAsset: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
    factories: [
      {
        factory: "0x59968008a703dC13E6beaECed644bdCe4ee45d13",
        fromBlock: 22350352,
        eventAbi:
          "event CreateNewMarket (address indexed market, address indexed PT, int256 scalarRoot, int256 initialAnchor, uint256 lnFeeRateRoot)",
        topics: [
          "0xae811fae25e2770b6bd1dcb1475657e8c3a976f91d1ebf081271db08eef920af",
        ],
      },
    ],
  },
  berachain: {
    toAsset: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
    factories: [
      {
        factory: "0x8A09574b0401A856d89d1b583eE22E8cb0C5530B",
        fromBlock: 806127,
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
  return Promise.all([
    ...Object.keys(config).map((chain: string) =>
      getTokenPrices(timestamp, chain, config[chain]),
    ),
    // getApiPrices(timestamp),
  ]);
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
