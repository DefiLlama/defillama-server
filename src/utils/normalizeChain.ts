const normalizedChainReplacements = {
  "binance":"bsc",
  "wanchain": "wan",
  "kucoin": "kcc",
} as {
  [chain:string]:string
}

export function normalizeChain(chain: string) {
  let normalizedChain = chain.toLowerCase();
  return normalizedChainReplacements[normalizedChain] ?? normalizedChain;
}

export const nonChains = ['PK', 'SK', 'tvl', 'tvlPrev1Hour', 'tvlPrev1Day', 'tvlPrev1Week']

export function addToChains(chains:string[], chainDisplayName:string){
  if (chainCoingeckoIds[chainDisplayName] !== undefined) {
    chains.push(chainDisplayName);
  } else if(chainDisplayName.includes('-')){
    const chainName = chainDisplayName.split('-')[0]
    addToChains(chains, chainDisplayName)
  }
}

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
    cmcId: null,
  },
  "Optimism": {
    geckoId: null,
    symbol: null,
    cmcId: null,
  },
  "Stacks": {
    geckoId: "blockstack",
    symbol: "STX",
    cmcId: "4847",
  },
  "PolyNetwork": {
    geckoId: null,
    symbol: null,
    cmcId: null,
  },
  "Conflux": {
    geckoId: "conflux-token",
    symbol: "CFX",
    cmcId: "7334",
  },
  "Nuls": {
    geckoId: "nuls",
    symbol: "NULS",
    cmcId: "2092",
  },
  "Witnet": {
    geckoId: null,
    symbol: null,
    cmcId: null,
  },
  "Binance": {
    geckoId: "binancecoin",
    symbol: "BNB",
    cmcId: "1839",
  },
  "BSC": {
    geckoId: "binancecoin",
    symbol: "BNB",
    cmcId: "1839",
  },
  "Avalanche": {
    geckoId: "avalanche-2",
    symbol: "AVAX",
    cmcId: "5805",
  },
  "Solana": {
    geckoId: "solana",
    symbol: "SOL",
    cmcId: "5426",
  },
  "Polygon": {
    geckoId: "matic-network",
    symbol: "MATIC",
    cmcId: "3890",
  },
  "Terra": {
    geckoId: "terra-luna",
    symbol: "LUNA",
    cmcId: "4172",
  },
  "Fantom": {
    geckoId: "fantom",
    symbol: "FTM",
    cmcId: "3513",
  },
  "xDai": {
    geckoId: "xdai-stake",
    symbol: "STAKE",
    cmcId: "5601",
  },
  "Heco": {
    geckoId: "huobi-token",
    symbol: "HT",
    cmcId: "2502",
  },
  "Kava": {
    geckoId: "kava",
    symbol: "KAVA",
    cmcId: "4846",
  },
  "OKExChain": {
    geckoId: "okexchain",
    symbol: "OKT",
    cmcId: "8267",
  },
  "Wanchain": {
    geckoId: "wanchain",
    symbol: "WAN",
    cmcId: "2606",
  },
  "DefiChain": {
    geckoId: "defichain",
    symbol: "DFI",
    cmcId: "5804",
  },
  "Ontology": {
    geckoId: "ontology",
    symbol: "ONT",
    cmcId: "2566",
  },
  "Bitcoin": {
    geckoId: "bitcoin",
    symbol: "BTC",
    cmcId: "1",
  },
  "Energi": {
    geckoId: "energi",
    symbol: "NRG",
    cmcId: "3218",
  },
  "Secret": {
    geckoId: "secret",
    symbol: "SCRT",
    cmcId: "5604",
  },
  "Zilliqa": {
    geckoId: "zilliqa",
    symbol: "ZIL",
    cmcId: "2469",
  },
  "NEO": {
    geckoId: "neo",
    symbol: "NEO",
    cmcId: "1376",
  },
  "Harmony": {
    geckoId: "harmony",
    symbol: "ONE",
    cmcId: "3945",
  },
  "RSK": {
    geckoId: "rootstock",
    symbol: "RBTC",
    cmcId: "3626",
  },
  "Sifchain": {
    geckoId: "sifchain",
    symbol: "EROWAN",
    cmcId: "8541",
  },
  "Algorand": {
    geckoId: "algorand",
    symbol: "ALGO",
    cmcId: "4030",
  },
  "Osmosis": {
    geckoId: "osmosis",
    symbol: "OSMO",
    cmcId: "12220",
  },
  "Thorchain": {
    geckoId: "thorchain",
    symbol: "RUNE",
    cmcId: "4157",
  },
  "Tron": {
    geckoId: "tron",
    symbol: "TRON",
    cmcId: "1958",
  },
  "Icon": {
    geckoId: "icon",
    symbol: "ICX",
    cmcId: "2099",
  },
  "Tezos": {
    geckoId: "tezos",
    symbol: "XTZ",
    cmcId: "2011",
  },
  "Celo": {
    geckoId: "celo",
    symbol: "CELO",
    cmcId: "5567",
  },
  "Kucoin": {
    geckoId: "kucoin-shares",
    symbol: "KCS",
    cmcId: "2087",
  },
  "Karura": {
    geckoId: "karura",
    symbol: "KAR",
    cmcId: "10042",
  },
  "Moonriver": {
    geckoId: "moonriver",
    symbol: "MOVR",
    cmcId: "9285",
  },
  "Waves": {
    geckoId: "waves",
    symbol: "WAVES",
    cmcId: "1274",
  },
  "Klaytn": {
    geckoId: "klay-token",
    symbol: "KLAY",
    cmcId: "4256",
  },
  "IoTeX": {
    geckoId: "iotex",
    symbol: "IOTX",
    cmcId: "2777",
  },
  "Ultra": {
    geckoId: "ultra",
    symbol: "UOS",
    cmcId: "4189",
  },
  "Kusama": {
    geckoId: "kusama",
    symbol: "KSM",
    cmcId: "5034",
  },
  "Shiden": {
    geckoId: 'shiden',
    symbol: 'SDN',
    cmcId: '11451',
  },
  "Telos": {
    geckoId: "telos",
    symbol: "TLOS",
    cmcId: "4660",
  },
  "ThunderCore": {
    geckoId: "thunder-token",
    symbol: "TT",
    cmcId: "3930",
  },
  "Lamden": {
    geckoId: "lamden",
    symbol: "TAU",
    cmcId: "2337",
  },
  "Near": {
    geckoId: "near",
    symbol: "NEAR",
    cmcId: "6535",
  },
  "EOS": {
    geckoId: "eos",
    symbol: "EOS",
    cmcId: "1765",
  },
  "Songbird": {
      geckoId: "songbird",
      symbol: "SGB",
      cmcId: "12186",
  },
  "EnergyWeb": {
      geckoId: "energy-web-token",
      symbol: "EWT",
      cmcId: "5268",
  },
  "HPB": {
      geckoId: "high-performance-blockchain",
      symbol: "HPB",
      cmcId: "2345",
  },
  "GoChain": {
      geckoId: "gochain",
      symbol: "GO",
      cmcId: "2861",
  },
  "TomoChain": {
      geckoId: "tomochain",
      symbol: "TOMO",
      cmcId: "2570",
  },
  "Fusion": {
    geckoId: "fsn",
    symbol: "FSN",
    cmcId: "2530",
  },
  "Kardia": {
    geckoId: "kardiachain",
    symbol: "KAI",
    cmcId: "5453",
  },
  "Fuse": {
    geckoId: "fuse-network-token",
    symbol: "FUSE",
    cmcId: "5634",
  },
  "SORA": {
    geckoId: "sora",
    symbol: "XOR",
    cmcId: "5802",
  },
  "smartBCH": {
    geckoId: "bitcoin-cash",
    symbol: "BCH",
    cmcId: "1831",
  },
  "Elastos": {
    geckoId: "elastos",
    symbol: "ELA",
    cmcId: "2492",
  },
  "Hoo": {
    geckoId: "hoo-token",
    symbol: "HOO",
    cmcId: "7543",
  },
  "Cronos": {
    geckoId: "crypto-com-chain",
    symbol: "CRO",
    cmcId: "3635",
  },
  "Polis": {
    geckoId: "polis",
    symbol: "POLIS",
    cmcId: "2359",
  },
  "ZYX": {
    geckoId: "zyx",
    symbol: "ZYX",
    cmcId: "6131",
  },
  "Elrond": {
    geckoId: "elrond-erd-2",
    symbol: "EGLD",
    cmcId: "6892",
  },
  "Stellar": {
    geckoId: "stellar",
    symbol: "XLM",
    cmcId: "512",
  },
  "Boba": {
    geckoId: "boba-network",
    symbol: "BOBA",
    cmcId: "14556",
  },
  "Metis": {
    geckoId: "metis-token",
    symbol: "METIS",
    cmcId: "9640",
  },
  "Ubiq": {
    geckoId: "ubiq",
    symbol: "UBQ",
    cmcId: "588",
  },
  "Mixin": {
    geckoId: "mixin",
    symbol: "XIN",
    cmcId: "2349",
  },
  "Everscale": {
    geckoId: "ton-crystal",
    symbol: "EVER",
    cmcId: "7505",
  },
  "VeChain": {
    geckoId: "vechain",
    symbol: "VET",
    cmcId: "3077",
  },
  "XDC": {
    geckoId: "xdce-crowd-sale",
    symbol: "XDC",
    cmcId: "2634",
  },
  "Velas": {
    geckoId: "velas",
    symbol: "VLX",
    cmcId: "4747",
  },
} as {
  [chain: string]: {
    geckoId: string | null,
    symbol: string | null,
    cmcId: string | null,
  }
}

export const extraSections = ["staking", "pool2", "offers"]

export function transformNewChainName(chain:string){
  switch (chain) {
    case "Binance":
      return "BSC"
    default:
      return chain
  }
}

export function getChainDisplayName(normalizedChain: string, useNewChainNames: boolean):string {
  if(extraSections.includes(normalizedChain)){
    return normalizedChain
  }
  if(normalizedChain.includes('-')){
    return normalizedChain.split('-').map(chain=>getChainDisplayName(chain, useNewChainNames)).join('-')
  }
  switch (normalizedChain) {
    case "bsc":
      return useNewChainNames?"BSC":"Binance"
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
    case "stacks":
      return "Stacks"
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
    case "telos":
      return "Telos"
    case "hpb":
      return "HPB"
    case "energyweb":
      return "EnergyWeb"
    case "gochain":
      return "GoChain"
    case "tomochain":
      return "TomoChain"
    case "fusion":
      return "Fusion"
    case "kardia":
      return "Kardia"
    case "fuse":
      return "Fuse"
    case "sora":
      return "SORA"
    case "smartbch":
      return "smartBCH"
    case "elastos":
      return "Elastos"
    case "hoo":
      return "Hoo"
    case "cronos":
      return "Cronos"
    case "polis":
      return "Polis"
    case "zyx":
      return "ZYX"
    case "elrond":
      return "Elrond"
    case "stellar":
      return "Stellar"
    case "shiden":
      return "Shiden"
    case "metis":
      return "Metis"
    case "ubiq":
      return "Ubiq"
    case "mixin":
      return "Mixin"
    case "everscale":
      return "Everscale"
    case "vechain":
      return "VeChain"
    case "xdc":
      return "XDC"
    case "velas":
      return "Velas"
    case "ethereumclassic":
      return "EthereumClassic"
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
