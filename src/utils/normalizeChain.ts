export function normalizeChain(chain: string) {
  let normalizedChain = chain.toLowerCase();
  if (normalizedChain === "binance") {
    return "bsc";
  } else if (normalizedChain === "wanchain") {
    return "wan";
  } else if (normalizedChain === "kucoin") {
    return "kcc"
  }
  return normalizedChain;
}

export const nonChains = ['PK', 'SK', 'tvl', 'tvlPrev1Hour', 'tvlPrev1Day', 'tvlPrev1Week']

export const chainMap = {
  "Avalanche": true,
  "Ethereum": true,
  "xDai": true,
  "Polygon": true,
  "Arbitrum": true,
  "Fantom": true,
  "Solana": true,
  "Terra": true,
  "OKExChain": true,
  "Moonriver": true,
  "Kucoin": true,
  "Harmony": true,
  "Binance": true,
  "Heco": true,
  "Palm": true,
  "Celo": true,
  "Optimism": true,
  "Waves": true,
  "DefiChain": true,
  "Stacks": true,
  "Tron": true,
  "Osmosis": true,
  "Kava": true,
  "PolyNetwork": true,
  "EOS": true,
  "Ultra": true,
  "Telos": true,
  "Icon": true,
  "Bitcoin": true,
  "Thorchain": true,
  "NEO": true,
  "RSK": true,
  "Secret": true,
  "Ontology": true,
  "Algorand": true,
  "Near": true,
  "Zilliqa": true,
  "Sifchain": true,
  "Wanchain": true,
  "Tezos": true,
  "Karura": true,
  "Conflux": true,
  "Nuls": true,
  "Energi": true,
  "Multi-Chain": true,
  "IoTeX": true,
  "ThunderCore": true,
  "Lamden": true,
  "Kusama": true,
  "Witnet": true,
  "Klaytn": true,
} as {
  [chain:string]:true
}

export function getChainDisplayName(normalizedChain: string) {
  switch (normalizedChain) {
    case "bsc":
      return "Binance"
    case "wan":
      return "Wanchain"
    case "kcc":
      return "Kucoin"
    case "xdai":
      return "xDai"
    case "avax":
      return "Avalanche"
    case "okexchain":
      return "OKExChain"
    case "defichain":
      return "DefiChain"
    case "polynetwork":
      return "PolyNetwork"
    case "eos":
      return "EOS"
    case "neo":
      return "NEO"
    case "rsk":
      return "RSK"
    case "iotex":
      return "IoTeX"
    case "thundercore":
      return "ThunderCore"
    default:
      return normalizedChain.slice(0, 1).toUpperCase() + normalizedChain.slice(1) // Capitalize first letter
  }
}

export function getDisplayChain(chains: string[]) {
  if (chains.length > 1) {
    return "Multi-Chain";
  } else {
    return chains[0];
  }
}
