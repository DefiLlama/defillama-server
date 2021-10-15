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
    symbol: "ETH",
    cmcId: "1027",
  },
  "Arbitrum": {
    geckoId: null,
    symbol: null,
    cmcId: "11841",
  },
  "Palm": {
    geckoId: null,
    symbol: null,
    cmdId: null,
  },
  "Optimism": {
    geckoId: null,
    symbol: null,
    cmdId: null,
  },
  "Stacks": {
    geckoId: "blockstack",
    symbol: "STX",
    cmdId: "4847",
  },
  "PolyNetwork": {
    geckoId: null,
    symbol: null,
    cmdId: null,
  },
  "Conflux": {
    geckoId: "conflux-token",
    symbol: "CFX",
    cmdId: "7334",
  },
  "Nuls": {
    geckoId: "nuls",
    symbol: "NULS",
    cmdId: "2092",
  },
  "Witnet": {
    geckoId: null,
    symbol: null,
    cmdId: null,
  },
  "Binance": {
    geckoId: "binancecoin",
    symbol: "BNB",
    cmdId: "1839",
  },
  "Avalanche": {
    geckoId: "avalanche-2",
    symbol: "AVAX",
    cmdId: "5805",
  },
  "Solana": {
    geckoId: "solana",
    symbol: "SOL",
    cmdId: "5426",
  },
  "Polygon": {
    geckoId: "matic-network",
    symbol: "MATIC",
    cmdId: "3890",
  },
  "Terra": {
    geckoId: "terra-luna",
    symbol: "LUNA",
    cmdId: "4172",
  },
  "Fantom": {
    geckoId: "fantom",
    symbol: "FTM",
    cmdId: "3513",
  },
  "xDai": {
    geckoId: "xdai-stake",
    symbol: "STAKE",
    cmdId: "5601",
  },
  "Heco": {
    geckoId: "huobi-token",
    symbol: "HT",
    cmdId: "2502",
  },
  "Kava": {
    geckoId: "kava",
    symbol: "KAVA",
    cmdId: "4846",
  },
  "OKExChain": {
    geckoId: "okexchain",
    symbol: "OKT",
    cmdId: "8267",
  },
  "Wanchain": {
    geckoId: "wanchain",
    symbol: "WAN",
    cmdId: "2606",
  },
  "DefiChain": {
    geckoId: "defichain",
    symbol: "DFI",
    cmdId: "5804",
  },
  "Ontology": {
    geckoId: "ontology",
    symbol: "ONT",
    cmdId: "2566",
  },
  "Bitcoin": {
    geckoId: "bitcoin",
    symbol: "BTC",
    cmdId: "1",
  },
  "Energi": {
    geckoId: "energi",
    symbol: "NRG",
    cmdId: "3218",
  },
  "Secret": {
    geckoId: "secret",
    symbol: "SCRT",
    cmdId: "5604",
  },
  "Zilliqa": {
    geckoId: "zilliqa",
    symbol: "ZIL",
    cmdId: "2469",
  },
  "NEO": {
    geckoId: "neo",
    symbol: "NEO",
    cmdId: "1376",
  },
  "Harmony": {
    geckoId: "harmony",
    symbol: "ONE",
    cmdId: "3945",
  },
  "RSK": {
    geckoId: "rootstock",
    symbol: "RBTC",
    cmdId: "3626",
  },
  "Sifchain": {
    geckoId: "sifchain",
    symbol: "EROWAN",
    cmdId: "8541",
  },
  "Algorand": {
    geckoId: "algorand",
    symbol: "ALGO",
    cmdId: "4030",
  },
  "Osmosis": {
    geckoId: "osmosis",
    symbol: "OSMO",
    cmdId: "12220",
  },
  "Thorchain": {
    geckoId: "thorchain",
    symbol: "RUNE",
    cmdId: "4157",
  },
  "Tron": {
    geckoId: "tron",
    symbol: "TRON",
    cmdId: "1958",
  },
  "Icon": {
    geckoId: "icon",
    symbol: "ICX",
    cmdId: "2099",
  },
  "Tezos": {
    geckoId: "tezos",
    symbol: "XTZ",
    cmdId: "2011",
  },
  "Celo": {
    geckoId: "celo",
    symbol: "CELO",
    cmdId: "5567",
  },
  "Kucoin": {
    geckoId: "kucoin-shares",
    symbol: "KCS",
    cmdId: "2087",
  },
  "Karura": {
    geckoId: "karura",
    symbol: "KAR",
    cmdId: "10042",
  },
  "Moonriver": {
    geckoId: "moonriver",
    symbol: "MOVR",
    cmdId: "9285",
  },
  "Waves": {
    geckoId: "waves",
    symbol: "WAVES",
    cmdId: "1274",
  },
  "Klaytn": {
    geckoId: "klay-token",
    symbol: "KLAY",
    cmdId: "4256",
  },
  "IoTeX": {
    geckoId: "iotex",
    symbol: "IOTX",
    cmdId: "2777",
  },
  "Ultra": {
    geckoId: "ultra",
    symbol: "UOS",
    cmdId: "4189",
  },
  "Kusama": {
    geckoId: "kusama",
    symbol: "KSM",
    cmdId: "5034",
  },
  "Telos": {
    geckoId: "telos",
    symbol: "TLOS",
    cmdId: "4660",
  },
  "ThunderCore": {
    geckoId: "thunder-token",
    symbol: "TT",
    cmdId: "3930",
  },
  "Lamden": {
    geckoId: "lamden",
    symbol: "TAU",
    cmdId: "2337",
  },
  "Near": {
    geckoId: "near",
    symbol: "NEAR",
    cmdId: "6535",
  },
  "EOS": {
    geckoId: "eos",
    symbol: "EOS",
    cmdId: "1765",
  },
  "Songbird": {
      geckoId: "songbird",
      symbol: "SGB",
      cmdId: "12186",
  },
  "EnergyWeb": {
      geckoId: "energy-web-token",
      symbol: "EWT",
      cmdId: "5268",
  },
  "HPB": {
      geckoId: "high-performance-blockchain",
      symbol: "HPB",
      cmdId: "2345",
  },
  "GoChain": {
      geckoId: "gochain",
      symbol: "GO",
      cmdId: "2861",
  },
  "TomoChain": {
      geckoId: "tomochain",
      symbol: "TOMO",
      cmdId: "2570",
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
