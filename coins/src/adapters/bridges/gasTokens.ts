const chainTokens = [
  // chain, coingeckoId, symbol
  ["ethereum", "ethereum", "ETH"],
  ["optimism", "ethereum", "OETH"],
  ["arbitrum", "ethereum", "ETH"],
  ["scroll", "ethereum", "ETH"],
  ["base", "ethereum", "ETH"],
  ["manta", "ethereum", "ETH"],
  ["beam", "merit-circle", "MC"],
  ["ronin", "ronin", "RON"],
  ["bfc", "bifrost", "BFC"],
  ["shimmer_evm", "shimmer", "SMR"],
  ["polygon", "matic-network", "MATIC"],
  ["moonriver", "moonriver", "MOVR"],
  ["fantom", "fantom", "FTM"],
  ["avax", "avalanche-2", "AVAX"],
  ["bsc", "binancecoin", "BNB"],
  ["op_bnb", "binancecoin", "BNB"],
  ["xdai", "dai", "xDAI"],
  ["okexchain", "oec-token", "OKC"],
  ["heco", "huobi-token", "HT"],
  ["celo", "celo", "CELO"],
  ["harmony", "harmony", "ONE"],
  ["ontology", "ong", "ONG"],
  ["polygon_zkevm", "ethereum", "ETH"],
  ["evmos", "evmos", "EVMOS"],
  ["filecoin", "filecoin", "FIL"],
];

export default async function bridge() {
  return chainTokens
    .map((t) => {
      const [chain, cgId, symbol] = t;
      return [
        {
          decimals: 18,
          from: `${chain}:0x0000000000000000000000000000000000000000`,
          to: `coingecko#${cgId}`,
          symbol,
        },
        {
          decimals: 18,
          from: `${chain}:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`,
          to: `coingecko#${cgId}`,
          symbol,
        },
      ];
    })
    .flat();
}
