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

export const chainCoingeckoIds = {
  "Ethereum": {
    geckoId: "ethereum",
    symbol: "ETH"
  },
  "Arbitrum": {
    geckoId: null,
    symbol: null
  },
  "Palm": {
    geckoId: null,
    symbol: null
  },
  "Optimism": {
    geckoId: null,
    symbol: null
  },
  "Stacks": {
    geckoId: null,
    symbol: null
  },
  "PolyNetwork": {
    geckoId: null,
    symbol: null
  },
  "Conflux": {
    geckoId: null,
    symbol: null
  },
  "Nuls": {
    geckoId: null,
    symbol: null
  },
  "Witnet": {
    geckoId: null,
    symbol: null
  },
  "Binance": {
    geckoId: "binancecoin",
    symbol: "BNB"
  },
  "Avalanche": {
    geckoId: "avalanche-2",
    symbol: "AVAX"
  },
  "Solana": {
    geckoId: "solana",
    symbol: "SOL"
  },
  "Polygon": {
    geckoId: "matic-network",
    symbol: "MATIC"
  },
  "Terra": {
    geckoId: "terra-luna",
    symbol: "LUNA"
  },
  "Fantom": {
    geckoId: "fantom",
    symbol: "FTM"
  },
  "xDai": {
    geckoId: "xdai-stake",
    symbol: "STAKE"
  },
  "Heco": {
    geckoId: "huobi-token",
    symbol: "HT"
  },
  "Kava": {
    geckoId: "kava",
    symbol: "KAVA"
  },
  "OKExChain": {
    geckoId: "okexchain",
    symbol: "OKT"
  },
  "Wanchain": {
    geckoId: "wanchain",
    symbol: "WAN"
  },
  "DefiChain": {
    geckoId: "defichain",
    symbol: "DFI"
  },
  "Ontology": {
    geckoId: "ontology",
    symbol: "ONT"
  },
  "Bitcoin": {
    geckoId: "bitcoin",
    symbol: "BTC"
  },
  "Energi": {
    geckoId: "energi",
    symbol: "NRG"
  },
  "Secret": {
    geckoId: "secret",
    symbol: "SCRT"
  },
  "Zilliqa": {
    geckoId: "zilliqa",
    symbol: "ZIL"
  },
  "NEO": {
    geckoId: "neo",
    symbol: "NEO"
  },
  "Harmony": {
    geckoId: "harmony",
    symbol: "ONE"
  },
  "RSK": {
    geckoId: "rootstock",
    symbol: "RBTC"
  },
  "Sifchain": {
    geckoId: "sifchain",
    symbol: "EROWAN"
  },
  "Algorand": {
    geckoId: "algorand",
    symbol: "ALGO"
  },
  "Osmosis": {
    geckoId: "osmosis",
    symbol: "OSMO"
  },
  "Thorchain": {
    geckoId: "thorchain",
    symbol: "RUNE"
  },
  "Tron": {
    geckoId: "tron",
    symbol: "TRON"
  },
  "Icon": {
    geckoId: "icon",
    symbol: "ICX"
  },
  "Tezos": {
    geckoId: "tezos",
    symbol: "XTZ"
  },
  "Celo": {
    geckoId: "celo",
    symbol: "CELO"
  },
  "Kucoin": {
    geckoId: "kucoin-shares",
    symbol: "KCS"
  },
  "Karura": {
    geckoId: "karura",
    symbol: "KAR"
  },
  "Moonriver": {
    geckoId: "moonriver",
    symbol: "MOVR"
  },
  "Waves": {
    geckoId: "waves",
    symbol: "WAVES"
  },
  "Klaytn": {
    geckoId: "klay-token",
    symbol: "KLAY"
  },
  "IoTeX": {
    geckoId: "iotex",
    symbol: "IOTX"
  },
  "Ultra": {
    geckoId: "ultra",
    symbol: "UOS"
  },
  "Kusama": {
    geckoId: "kusama",
    symbol: "KSM"
  },
  "Telos": {
    geckoId: "telos",
    symbol: "TLOS"
  },
  "ThunderCore": {
    geckoId: "thunder-token",
    symbol: "TT"
  },
  "Lamden": {
    geckoId: "lamden",
    symbol: "TAU"
  },
  "Near": {
    geckoId: "near",
    symbol: "NEAR"
  },
  "EOS": {
    geckoId: "eos",
    symbol: "EOS"
  },
} as {
  [chain: string]: {
    geckoId: string | null,
    symbol: string | null
  }
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
