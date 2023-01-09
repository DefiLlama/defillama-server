const chainTokens = [
  // chain, coingeckoId, symbol
  ["ethereum", "ethereum", "ETH"],
  ["optimism", "ethereum", "OETH"],
  ["arbitrum", "ethereum", "ETH"],
  ["polygon", "matic-network", "MATIC"],
  ["moonriver", "moonriver", "MOVR"],
  ["fantom", "fantom", "FTM"],
  ["avax", "avalanche-2", "AVAX"],
  ["bsc", "binancecoin", "BNB"],
  ["xdai", "dai", "xDAI"],
  ["okexchain", "oec-token", "OKC"],
  ["heco", "huobi-token", "HT"],
  ["celo", "celo", "CELO"],
  ["harmony", "harmony", "ONE"],
  ["ontology", "ong", "ONG"],
];

export default async function bridge() {
  return chainTokens.map((t) => {
    const [chain, cgId, symbol] = t;
    return {
      decimals: 18,
      from: `${chain}:0x0000000000000000000000000000000000000000`,
      to: `coingecko#${cgId}`,
      symbol,
    };
  });
}
