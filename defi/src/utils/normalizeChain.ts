export const normalizedChainReplacements = {
  // keys should be full lowercase
  "binance": "bsc",
  "wanchain": "wan",
  "kucoin": "kcc",
  "terra classic": "terra",
  "nova network": "nova",
  "godwokenv1": "godwoken_v1",
  "arbitrum nova": "arbitrum_nova",
  "zksync era": "era",
  "polygon zkevm": "polygon_zkevm",
  "eos evm": "eos_evm",
  "oasys": "oas",
  "map relay chain": "map",
  "pulsechain": "pulse",
  "opbnb": "op_bnb",
  "bifrost network": "bfc",
  "horizen eon": "eon"
} as {
  [chain: string]: string
}

export function normalizeChain(chain: string) {
  let normalizedChain = chain.toLowerCase();
  return normalizedChainReplacements[normalizedChain] ?? normalizedChain;
}

export function isDoubleCounted(moduleDoubleCounted?: boolean, category?: string) {
  return moduleDoubleCounted ?? (category === "Yield Aggregator" || category === "Yield");
}

export function isExcludedFromChainTvl(category?: string) {
  return category === "RWA";
}

export const nonChains = ['PK', 'SK', 'tvl', 'tvlPrev1Hour', 'tvlPrev1Day', 'tvlPrev1Week']

export function addToChains(chains: string[], chainDisplayName: string) {
  if (chainCoingeckoIds[chainDisplayName] !== undefined && !chains.includes(chainDisplayName)) {
    chains.push(chainDisplayName);
  } else if (chainDisplayName.includes('-')) {
    const chainName = chainDisplayName.split('-')[0]
    addToChains(chains, chainName)
  }
}

export const chainCoingeckoIds = {
  "Ethereum": {
    geckoId: "ethereum",
    symbol: "ETH",
    cmcId: "1027",
    categories: ["EVM"],
    chainId: 1,
    github: [
      // Execution clients
      'ethereum', 'NethermindEth', 'ConsenSys', 'openethereum', 'hyperledger', 'ledgerwatch',
      // Consensus clients 
      'sigp', 'chainsafe', 'status-im', 'prysmaticlabs',
    ],
  },
  "Arbitrum": {
    geckoId: "arbitrum",
    symbol: "ARB",
    cmcId: "11841",
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 42161,
    governanceID: ["snapshot:arbitrumfoundation.eth"],
    github: ['OffchainLabs'],
  },
  "Palm": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    chainId: 11297108109,
  },
  "Optimism": {
    geckoId: "optimism",
    symbol: "OP",
    cmcId: "11840",
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 10,
    governanceID: ["snapshot:opcollective.eth", "eip155:10:0xcDF27F107725988f2261Ce2256bDfCdE8B382B10"],
    github: ['ethereum-optimism'],
  },
  "Stacks": {
    geckoId: "blockstack",
    symbol: "STX",
    cmcId: "4847",
    github: ['stacks-network'],
  },
  "PolyNetwork": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    github: ['polynetwork'],
  },
  "Conflux": {
    geckoId: "conflux-token",
    symbol: "CFX",
    cmcId: "7334",
    github: ['Conflux-Chain'],
  },
  "Nuls": {
    geckoId: "nuls",
    symbol: "NULS",
    cmcId: "2092",
    github: ['nuls-io'],
  },
  "Witnet": {
    geckoId: "witnet",
    symbol: "WIT",
    cmcId: "14925",
    github: ['witnet'],
  },
  "BSC": {
    geckoId: "binancecoin",
    symbol: "BNB",
    cmcId: "1839",
    categories: ["EVM"],
    chainId: 56,
    github: ['bnb-chain'],
  },
  "Avalanche": {
    geckoId: "avalanche-2",
    symbol: "AVAX",
    cmcId: "5805",
    categories: ["EVM"],
    github: ['ava-labs'],
    chainId: 43114,
  },
  "Solana": {
    geckoId: "solana",
    symbol: "SOL",
    cmcId: "5426",
    github: ['solana-labs'],
  },
  "Polygon": {
    geckoId: "matic-network",
    symbol: "MATIC",
    cmcId: "3890",
    categories: ["EVM"],
    chainId: 137,
    github: ['maticnetwork'],
  },
  "Terra Classic": {
    geckoId: "terra-luna",
    symbol: "LUNC",
    cmcId: "4172",
    categories: ["Cosmos"],
    github: ['terra-money'],
  },
  "Fantom": {
    geckoId: "fantom",
    symbol: "FTM",
    cmcId: "3513",
    categories: ["EVM"],
    chainId: 250,
    github: ['Fantom-foundation'],
  },
  "Gnosis": {
    geckoId: "gnosis",
    symbol: "GNO",
    cmcId: "1659",
    categories: ["EVM"],
    chainId: 100,
    governanceID: ["snapshot:xdaistake.eth"],
    github: ['gnosis'],
  },
  "XdaiArb": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    chainId: 200,
  },
  "Heco": {
    geckoId: "huobi-token",
    symbol: "HT",
    cmcId: "2502",
    categories: ["EVM"],
    chainId: 128,
  },
  "Kava": {
    geckoId: "kava",
    github: ['Kava-Labs'],
    symbol: "KAVA",
    cmcId: "4846",
    categories: ["EVM", "Cosmos"],
  },
  "OKTChain": {
    geckoId: "oec-token",
    github: ['okx'],
    symbol: "OKT",
    cmcId: "8267",
    categories: ["EVM", "Cosmos"],
    chainId: 66,
  },
  "Wanchain": {
    geckoId: "wanchain",
    github: ['wanchain'],
    symbol: "WAN",
    cmcId: "2606",
    categories: ["EVM"],
    chainId: 888,
  },
  "Posichain": {
    geckoId: "position-token",
    github: ['PositionExchange'],
    symbol: "POSI",
    cmcId: "11234",
    categories: ["EVM"],
    chainId: 900000,
  },
  "DefiChain": {
    geckoId: "defichain",
    github: ['DeFiCh'],
    symbol: "DFI",
    cmcId: "5804",
  },
  "Ontology": {
    geckoId: "ontology",
    github: ['ontio'],
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
    github: ['energicryptocurrency'],
    symbol: "NRG",
    cmcId: "3218",
    categories: ["EVM"],
    chainId: 39797,
  },
  "Secret": {
    geckoId: "secret",
    github: ['scrtlabs'],
    symbol: "SCRT",
    cmcId: "5604",
    categories: ["Cosmos"],
  },
  "Zilliqa": {
    geckoId: "zilliqa",
    github: ['Zilliqa'],
    symbol: "ZIL",
    cmcId: "2469",
  },
  "NEO": {
    geckoId: "neo",
    github: ['neo-project'],
    symbol: "NEO",
    cmcId: "1376",
  },
  "Harmony": {
    geckoId: "harmony",
    github: ['harmony-one'],
    symbol: "ONE",
    cmcId: "3945",
    categories: ["EVM"],
    chainId: 1666600000,
    governanceID: ["snapshot:harmony-mainnet.eth"]
  },
  "Rootstock": {
    geckoId: "rootstock",
    github: ['rsksmart'],
    symbol: "RBTC",
    cmcId: "3626",
    categories: ["EVM"],
    parent: {
      chain: "Bitcoin",
      types: ["gas"]
    },
    chainId: 30,
  },
  "Sifchain": {
    geckoId: "sifchain",
    github: ['Sifchain'],
    symbol: "EROWAN",
    cmcId: "8541",
    categories: ["Cosmos"],
  },
  "Algorand": {
    geckoId: "algorand",
    github: ['algorand'],
    symbol: "ALGO",
    cmcId: "4030",
  },
  "Osmosis": {
    geckoId: "osmosis",
    github: ['osmosis-labs'],
    symbol: "OSMO",
    cmcId: "12220",
    categories: ["Cosmos"],
  },
  "Thorchain": {
    geckoId: "thorchain",
    github: ['thorchain'],
    symbol: "RUNE",
    cmcId: "4157",
    categories: ["Cosmos"],
  },
  "Tron": {
    geckoId: "tron",
    github: ['tronprotocol'],
    symbol: "TRON",
    cmcId: "1958",
    categories: ["EVM"],
  },
  "Icon": {
    geckoId: "icon",
    github: ['icon-project'],
    symbol: "ICX",
    cmcId: "2099",
  },
  "Tezos": {
    geckoId: "tezos",
    github: ['tezos'],
    symbol: "XTZ",
    cmcId: "2011",
  },
  "Celo": {
    geckoId: "celo",
    github: ['celo-org'],
    symbol: "CELO",
    cmcId: "5567",
    categories: ["EVM"],
    chainId: 42220,
  },
  "KCC": {
    geckoId: "kucoin-shares",
    github: ['kcc-community'],
    symbol: "KCS",
    cmcId: "2087",
    categories: ["EVM"],
    chainId: 321,
    governanceID: ["snapshot:kcc.eth"]
  },
  "Karura": {
    geckoId: "karura",
    github: ['AcalaNetwork'],
    symbol: "KAR",
    cmcId: "10042",
    categories: ["Parachain"],
    parent: {
      chain: "Kusama",
      types: ["parachain"]
    },
  },
  "Moonriver": {
    geckoId: "moonriver",
    github: ['PureStake'],
    symbol: "MOVR",
    cmcId: "9285",
    categories: ["EVM", "Parachain"],
    parent: {
      chain: "Kusama",
      types: ["parachain"]
    },
    chainId: 1285,
  },
  "Waves": {
    geckoId: "waves",
    github: ['wavesplatform'],
    symbol: "WAVES",
    cmcId: "1274",
  },
  "Klaytn": {
    geckoId: "klay-token",
    github: ['klaytn'],
    symbol: "KLAY",
    cmcId: "4256",
    categories: ["EVM"],
    chainId: 8217,
  },
  "IoTeX": {
    geckoId: "iotex",
    github: ['iotexproject'],
    symbol: "IOTX",
    cmcId: "2777",
    categories: ["EVM"],
    chainId: 4689,
    governanceID: ["snapshot:iotex.eth"]
  },
  "Ultra": {
    geckoId: "ultra",
    github: ['ultraio'],
    symbol: "UOS",
    cmcId: "4189",
  },
  "Kusama": {
    geckoId: "kusama",
    github: ['paritytech'],
    symbol: "KSM",
    cmcId: "5034",
  },
  "Shiden": {
    geckoId: 'shiden',
    github: ['AstarNetwork'],
    symbol: 'SDN',
    cmcId: '11451',
    categories: ["EVM", "Parachain"],
    parent: {
      chain: "Kusama",
      types: ["parachain"]
    },
    chainId: 336,
  },
  "Telos": {
    geckoId: "telos",
    github: ['telosnetwork'],
    symbol: "TLOS",
    cmcId: "4660",
    categories: ["EVM"],
    chainId: 40,
  },
  "ThunderCore": {
    geckoId: "thunder-token",
    github: ['thundercore'],
    symbol: "TT",
    cmcId: "3930",
    categories: ["EVM"],
    chainId: 108,
    governanceID: ["snapshot:thundercorelabs.eth"]
  },
  "Lamden": {
    geckoId: "lamden",
    github: ['Lamden'],
    symbol: "TAU",
    cmcId: "2337",
  },
  "Near": {
    geckoId: "near",
    github: ['near'],
    symbol: "NEAR",
    cmcId: "6535",
  },
  "EOS": {
    geckoId: "eos",
    github: ['EOSIO'],
    symbol: "EOS",
    cmcId: "1765",
  },
  "Songbird": {
    geckoId: "songbird",
    github: ['GateHubNet'],
    symbol: "SGB",
    cmcId: "12186",
    categories: ["EVM"],
    chainId: 19,
  },
  "EnergyWeb": {
    geckoId: "energy-web-token",
    github: ['energywebfoundation'],
    symbol: "EWT",
    cmcId: "5268",
    categories: ["EVM", "Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
    chainId: 246,
  },
  "HPB": {
    geckoId: "high-performance-blockchain",
    github: ['hpb-project'],
    symbol: "HPB",
    cmcId: "2345",
    categories: ["EVM"],
    chainId: 269,
    governanceID: ["snapshot:xinlian.eth"]
  },
  "GoChain": {
    geckoId: "gochain",
    github: ['gochain'],
    symbol: "GO",
    cmcId: "2861",
    categories: ["EVM"],
    chainId: 60,
  },
  "TomoChain": {
    geckoId: "tomochain",
    github: ['tomochain'],
    symbol: "TOMO",
    cmcId: "2570",
    categories: ["EVM"],
    chainId: 88,
  },
  "Fusion": {
    geckoId: "fsn",
    github: ['fsn-dev'],
    symbol: "FSN",
    cmcId: "2530",
    categories: ["EVM"],
    chainId: 32659,
  },
  "Kardia": {
    geckoId: "kardiachain",
    github: ['kardiachain'],
    symbol: "KAI",
    cmcId: "5453",
    categories: ["EVM"],
    chainId: 0,
  },
  "Fuse": {
    geckoId: "fuse-network-token",
    github: ['fuseio'],
    symbol: "FUSE",
    cmcId: "5634",
    categories: ["EVM"],
    chainId: 122,
    governanceID: ["snapshot:fusedao.eth"]
  },
  "smartBCH": {
    geckoId: "bitcoin-cash",
    github: ['smartbch'],
    symbol: "BCH",
    cmcId: "1831",
    categories: ["EVM"],
    chainId: 10000,
  },
  "Elastos": {
    geckoId: "elastos",
    github: ['elastos'],
    symbol: "ELA",
    cmcId: "2492",
    categories: ["EVM"],
    chainId: 20,
  },
  "Hoo": {
    geckoId: "hoo-token",
    github: ['hoosmartchain'],
    symbol: "HOO",
    cmcId: "7543",
    categories: ["EVM"],
    chainId: 70,
  },
  "Cronos": {
    geckoId: "crypto-com-chain",
    github: ['crypto-org-chain'],
    symbol: "CRO",
    cmcId: "3635",
    categories: ["EVM", "Cosmos"],
    chainId: 25,
  },
  "Polis": {
    geckoId: "polis",
    github: ['polischain'],
    symbol: "POLIS",
    cmcId: "2359",
    categories: ["EVM"],
    chainId: 333999,
    governanceID: ["snapshot:polis-dao.eth"]
  },
  "ZYX": {
    geckoId: "zyx",
    github: ['ZYXnetwork'],
    symbol: "ZYX",
    cmcId: "6131",
    categories: ["EVM"],
    chainId: 55,
  },
  "MultiversX": {
    geckoId: "elrond-erd-2",
    github: ['multiversx'],
    symbol: "EGLD",
    cmcId: "6892",
  },
  "Stellar": {
    geckoId: "stellar",
    github: ['stellar'],
    symbol: "XLM",
    cmcId: "512",
  },
  "Boba": {
    geckoId: "boba-network",
    github: ['bobanetwork'],
    symbol: "BOBA",
    cmcId: "14556",
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 288,
  },
  "Metis": {
    geckoId: "metis-token",
    github: ['MetisProtocol'],
    symbol: "METIS",
    cmcId: "9640",
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 1088,
    governanceID: ["snapshot:metislayer2.eth"]
  },
  "Ubiq": {
    geckoId: "ubiq",
    github: ['ubiq'],
    symbol: "UBQ",
    cmcId: "588",
    categories: ["EVM"],
    chainId: 8,
    governanceID: ["snapshot:ubiq.eth"]
  },
  "Mixin": {
    geckoId: "mixin",
    github: ['MixinNetwork'],
    symbol: "XIN",
    cmcId: "2349",
  },
  "Everscale": {
    geckoId: "everscale",
    github: ['everscale-org'],
    symbol: "EVER",
    cmcId: "7505",
  },
  "VeChain": {
    geckoId: "vechain",
    github: ['vechain'],
    symbol: "VET",
    cmcId: "3077",
  },
  "XDC": {
    geckoId: "xdce-crowd-sale",
    github: ['XDCFoundation'],
    symbol: "XDC",
    cmcId: "2634",
  },
  "Velas": {
    geckoId: "velas",
    github: ['velas'],
    symbol: "VLX",
    cmcId: "4747",
    categories: ["EVM"],
    chainId: 106,
    governanceID: ["snapshot:velascommunity.eth"]
  },
  "Polkadot": {
    geckoId: "polkadot",
    symbol: "DOT",
    cmcId: "6636",
    github: ['paritytech'],
  },
  "CosmosHub": {
    geckoId: "cosmos",
    github: ['cosmos'],
    symbol: "ATOM",
    cmcId: "3794",
  },
  "EthereumClassic": {
    geckoId: "ethereum-classic",
    github: ['ethereumclassic'],
    symbol: "ETC",
    cmcId: "1321",
    categories: ["EVM"],
    chainId: 61,
  },
  "Sora": {
    geckoId: "sora",
    github: ['sora-xor'],
    symbol: "XOR",
    cmcId: "5802",
  },
  "Aurora": {
    geckoId: "aurora-near",
    github: ['aurora-is-near'],
    symbol: "AURORA",
    cmcId: "14803",
    categories: ["EVM"],
    parent: {
      chain: "Near",
      types: ["emulator", "gas"]
    },
    chainId: 1313161554,
  },
  "Ronin": {
    geckoId: null,
    github: ['axieinfinity'],
    symbol: "RON",
    cmcId: null,
    categories: ["EVM"],
    chainId: 2020,
  },
  "SmartBCH": {
    geckoId: "bitcoin-cash",
    github: ['smartbch'],
    symbol: "BCH",
    cmcId: "1831",
    categories: ["EVM"],
    chainId: 10000,
  },
  "zkSync Lite": {
    geckoId: null,
    github: ['matter-labs'],
    symbol: null,
    cmcId: null,
    categories: ["Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
  },
  "Godwoken": {
    geckoId: null,
    github: ['godwokenrises'],
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    parent: {
      chain: "Nervos",
      types: ["emulator", "gas"]
    },
    chainId: 71394,
  },
  "Callisto": {
    geckoId: "callisto",
    github: ['CallistoNetwork'],
    symbol: "CLO",
    cmcId: "2757",
    categories: ["EVM"],
    chainId: 820,
  },
  "CSC": {
    geckoId: "coinex-token",
    github: ['casinocoin'],
    symbol: "CET",
    cmcId: "2941",
    categories: ["EVM"],
    chainId: 52,
  },
  "Ergo": {
    geckoId: "ergo",
    github: ['ergoplatform'],
    symbol: "ERG",
    cmcId: "1555",
  },
  "Cardano": {
    geckoId: "cardano",
    github: ['cardano-foundation'],
    symbol: "ADA",
    cmcId: "2010",
  },
  "Liquidchain": {
    geckoId: "liquidchain",
    github: ['Liquidchain'],
    symbol: "XLC",
    cmcId: null,
    categories: ["EVM"],
    chainId: 5050,
  },
  "Nahmii": {
    geckoId: "nahmii",
    github: ['nahmii'],
    symbol: "NII",
    cmcId: "4865",
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 5551,
  },
  "Parallel": {
    geckoId: null,
    github: ['parallelchain-io'],
    symbol: "PARA",
    cmcId: null,
    categories: ["Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
  },
  "Meter": {
    geckoId: "meter",
    github: ['meterio'],
    symbol: "MTRG",
    cmcId: "5919",
    categories: ["EVM"],
    chainId: 82,
    governanceID: ["snapshot:meter-mainnet.eth"]
  },
  "Oasis": {
    geckoId: "oasis-network",
    github: ['oasisprotocol'],
    symbol: "ROSE",
    cmcId: "7653",
    categories: ["EVM"],
    chainId: 42262,
  },
  "Theta": {
    geckoId: "theta-token",
    github: ['thetatoken'],
    symbol: "THETA",
    cmcId: "2416",
    categories: ["EVM"],
    chainId: 361,
  },
  "Syscoin": {
    geckoId: "syscoin",
    github: ['syscoin'],
    symbol: "SYS",
    cmcId: "541",
    categories: ["EVM"],
    chainId: 57,
  },
  "Moonbeam": {
    geckoId: "moonbeam",
    github: ['PureStake'],
    symbol: "GLMR",
    cmcId: "6836",
    categories: ["EVM", "Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
    chainId: 1284,
    governanceID: ["snapshot:moonbeam-foundation.eth"]
  },
  "Astar": {
    geckoId: "astar",
    github: ['AstarNetwork'],
    symbol: "ASTR",
    cmcId: "12885",
    categories: ["EVM", "Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
    chainId: 592,
  },
  "Curio": {
    geckoId: null,
    github: ['CurioTeam'],
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    parent: {
      chain: "SKALE",
      types: ["skale"]
    },
    chainId: 836542336838601,
    governanceID: ["snapshot:curiotools.eth"]
  },
  "SKALE": {
    geckoId: "skale",
    github: ['skalenetwork'],
    symbol: "SKL",
    cmcId: "5691",
    categories: ["EVM"],
  },
  "Bittorrent": {
    geckoId: "bittorrent",
    github: ['bttcprotocol'],
    symbol: "BTT",
    cmcId: "16086",
    categories: ["EVM"],
    chainId: 199,
  },
  "Genshiro": {
    geckoId: "genshiro",
    symbol: "GENS",
    cmcId: "10278",
    categories: ["Parachain", "EVM"],
    parent: {
      chain: "Kusama",
      types: ["parachain"]
    },
  },
  "Wax": {
    geckoId: "wax",
    github: ['worldwide-asset-exchange'],
    symbol: "WAXP",
    cmcId: "2300",
  },
  "Evmos": {
    geckoId: "evmos",
    github: ['evmos'],
    symbol: "EVMOS",
    cmcId: null,
    categories: ["EVM", "Cosmos"],
    chainId: "9001",
    governanceID: ["snapshot:evmosdao.eth"]
  },
  "Proton": {
    geckoId: "proton",
    github: ['ProtonProtocol', 'XPRNetwork'],
    symbol: "XPR",
    cmcId: "5350",
  },
  "Kadena": {
    geckoId: "kadena",
    github: ['kadena-io'],
    symbol: "KDA",
    cmcId: "5647",
  },
  "Vite": {
    geckoId: "vite",
    github: ['vitelabs'],
    symbol: "VITE",
    cmcId: "2937",
  },
  "Milkomeda C1": {
    geckoId: null,
    github: ['dcSpark'],
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    parent: {
      chain: "Cardano",
      types: ["gas"]
    },
    chainId: 2001,
  },
  "DFK": {
    geckoId: "defi-kingdoms",
    github: ['DefiKingdoms'],
    symbol: "JEWEL",
    cmcId: "12319",
    categories: ["EVM"],
    parent: {
      chain: "Avalanche",
      types: ["subnet"]
    },
    chainId: 53935,
  },
  "CLV": {
    geckoId: "clover-finance",
    github: ['clover-network'],
    symbol: "CLV",
    cmcId: "8384",
    categories: ["EVM", "Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
    chainId: 1024,
  },
  "REI": {
    geckoId: "rei-network",
    github: ['REI-Network'],
    symbol: "REI",
    cmcId: "19819",
    categories: ["EVM"],
    chainId: 47805,
    governanceID: ["snapshot:rei-network.eth"]
  },
  "Crab": {
    geckoId: "darwinia-crab-network",
    github: ['darwinia-network'],
    symbol: "CRAB",
    cmcId: "9243",
    categories: ["EVM"],
    chainId: 44,
  },
  "Hedera": {
    geckoId: "hedera-hashgraph",
    github: ['hashgraph'],
    symbol: "HBAR",
    cmcId: "4642",
    categories: ["EVM"],
  },
  "Findora": {
    geckoId: "findora",
    github: ['FindoraNetwork'],
    symbol: "FRA",
    cmcId: "4249",
    categories: ["EVM"],
    chainId: 2152,
  },
  "Hydra": {
    geckoId: "hydra",
    symbol: "HYDRA",
    cmcId: "8245",
    github: ["Hydra-Chain"]
  },
  "Bitgert": {
    geckoId: "bitrise-token",
    symbol: "BRISE",
    cmcId: "11079",
    categories: ["EVM"],
    chainId: 32520,
  },
  "Reef": {
    geckoId: "reef-finance",
    github: ['reef-defi'],
    symbol: "REEF",
    cmcId: "6951",
    categories: ["EVM", "Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
  },
  "Candle": {
    geckoId: "candle",
    symbol: "CNDL",
    cmcId: "18327",
    categories: ["EVM"],
    chainId: 534,
    governanceID: ["snapshot:cndl.eth"]
  },
  "Bifrost": {
    geckoId: "bifrost-native-coin",
    github: ['bifrost-finance'],
    symbol: "BNC",
    cmcId: "8705",
    categories: ["Parachain"],
    parent: {
      chain: "Kusama",
      types: ["parachain"]
    },
  },
  "Stafi": {
    geckoId: "stafi",
    github: ['stafihub'],
    symbol: "FIS",
    cmcId: "5882",
    categories: ["Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["Independent"]
    },
  },
  "Lachain": {
    geckoId: "latoken",
    github: ['LATOKEN'],
    symbol: "LA",
    cmcId: "2090",
    categories: ["EVM"],
    chainId: 225,
  },
  "Coti": {
    geckoId: "coti",
    github: ['coti-io'],
    symbol: "COTI",
    cmcId: "3992",
  },
  "Bitcoincash": {
    geckoId: "bitcoin-cash",
    symbol: "BCH",
    cmcId: "1831",
  },
  "Litecoin": {
    geckoId: "litecoin",
    github: ['litecoin-project'],
    symbol: "LTC",
    cmcId: "2",
  },
  "Doge": {
    geckoId: "dogecoin",
    github: ['dogecoin'],
    symbol: "DOGE",
    cmcId: "74",
  },
  "Obyte": {
    geckoId: "byteball",
    github: ['byteball'],
    symbol: "GBYTE",
    cmcId: "1492",
  },
  "REIchain": {
    geckoId: null,
    github: ['reichain'],
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    chainId: 55555,
  },
  "OntologyEVM": {
    geckoId: "ong",
    github: ['ontio'],
    symbol: "ONG",
    cmcId: "3217",
    categories: ["EVM"],
    chainId: 58,
  },
  "Carbon": {
    geckoId: "switcheo",
    github: ['Switcheo'],
    symbol: "SWTH",
    cmcId: "2620",
    categories: ["Cosmos"],
  },
  "Neo3": {
    geckoId: null,
    github: ['neo-project'],
    symbol: null,
    cmcId: null,
  },
  "Pallete": {
    geckoId: "palette",
    symbol: "PLT",
    cmcId: "16272",
    categories: ["EVM"],
  },
  "Bytomsidechain": {
    geckoId: "bytom",
    github: ['Bytom'],
    symbol: "BTM",
    cmcId: "1866",
    categories: ["EVM"],
  },
  "Starcoin": {
    geckoId: "starcoin",
    github: ['starcoinorg'],
    symbol: "STC",
    cmcId: "10202",
  },
  "Terra2": {
    geckoId: "terra-luna-2",
    github: ['terra-money'],
    symbol: "LUNA",
    cmcId: "20314",
    categories: ["Cosmos"],
  },
  "SXnetwork": {
    geckoId: "sx-network",
    github: ['sx-network'],
    symbol: "SX",
    cmcId: "8377",
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Polygon",
      types: ["L2", "gas"]
    },
  },
  "Echelon": {
    geckoId: "echelon",
    symbol: "ECH",
    cmcId: "20047",
    categories: ["EVM", "Cosmos"],
  },
  "MultiVAC": {
    geckoId: "multivac",
    github: ['multivactech'],
    symbol: "MTV",
    cmcId: "3853",
  },
  "ORE": {
    geckoId: "ptokens-ore",
    github: ['Open-Rights-Exchange'],
    symbol: "ORE",
    cmcId: "12743",
  },
  "LBRY": {
    geckoId: "lbry-credits",
    github: ['lbryio'],
    symbol: "LBC",
    cmcId: "1298",
  },
  "Ravencoin": {
    geckoId: "ravencoin",
    github: ['RavenProject'],
    symbol: "RVN",
    cmcId: "2577",
  },
  "Acala": {
    geckoId: "acala",
    github: ['AcalaNetwork'],
    symbol: "ACA",
    cmcId: "6756",
    categories: ["Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
  },
  "ICP": {
    geckoId: "internet-computer",
    github: ['dfinity'],
    symbol: "ICP",
    cmcId: "8916",
    governanceID: ["icp"]
  },
  "Nova Network": {
    geckoId: "supernova",
    github: ['nova-network-inc'],
    symbol: "SNT",
    cmcId: "15399",
    categories: ["EVM"],
    chainId: 87,
    governanceID: ["snapshot:novanetwork.eth"]
  },
  "Kintsugi": {
    geckoId: "kintsugi",
    github: ['interlay'],
    symbol: "KINT",
    cmcId: "13675",
    categories: ["Parachain"],
    parent: {
      chain: "Kusama",
      types: ["parachain"]
    },
  },
  "Filecoin": {
    geckoId: "filecoin",
    github: ['filecoin-project'],
    symbol: "FIL",
    cmcId: "2280",
    categories: ["EVM"],
  },
  "Flow": {
    geckoId: "flow",
    github: ['onflow'],
    symbol: "FLOW",
    cmcId: "4558",
  },
  "Kujira": {
    geckoId: "kujira",
    github: ['Team-Kujira'],
    symbol: "KUJI",
    cmcId: "15185",
    categories: ["Cosmos"],
  },
  "Heiko": {
    geckoId: null,
    github: ['parallelchain-io'],
    symbol: "HKO",
    cmcId: null,
    categories: ["Parachain"],
    parent: {
      chain: "Kusama",
      types: ["parachain"]
    }
  },
  "Dogechain": {
    geckoId: "dogechain",
    github: ['dogechain-lab'],
    symbol: "DG",
    cmcId: null,
    categories: ["EVM"],
  },
  "Canto": {
    geckoId: "canto",
    github: ['Canto-Network'],
    symbol: "CANTO",
    cmcId: "21516",
    categories: ["EVM", "Cosmos"],
  },
  "Ripple": {
    geckoId: "ripple",
    github: ['ripple'],
    symbol: "XRP",
    cmcId: "52",
  },
  "GodwokenV1": {
    geckoId: null,
    github: ['godwokenrises'],
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    parent: {
      chain: "Godwoken",
      types: ["emulator", "gas"]
    },
    chainId: 71402,
  },
  "Arbitrum Nova": {
    geckoId: null,
    github: ['OffchainLabs'],
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 42170,
  },
  "Ultron": {
    geckoId: "ultron",
    github: ['UltronFoundationDev'],
    symbol: "ULX",
    cmcId: "21524",
    categories: ["EVM"],
    chainId: 1231,
  },
  "Interlay": {
    geckoId: "interlay",
    github: ['interlay'],
    symbol: "INTR",
    cmcId: "20366",
    categories: ["Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
  },
  "Juno": {
    geckoId: "juno-network",
    github: ['CosmosContracts'],
    symbol: "JUNO",
    cmcId: "14299",
    categories: ["Cosmos"],
  },
  "Tombchain": {
    geckoId: "tomb",
    github: ['tomochain'],
    symbol: "TOMB",
    cmcId: "11495",
    categories: ["EVM"],
  },
  "Crescent": {
    geckoId: "crescent-network",
    github: ['crescent-network'],
    symbol: "CRE",
    cmcId: null,
    categories: ["Cosmos"],
  },
  "Vision": {
    geckoId: "vision-metaverse",
    github: ['vision-consensus'],
    symbol: "VS",
    cmcId: "19083",
    categories: ["EVM"],
    governanceID: ["snapshot:vnetwork.eth"]
  },
  "EthereumPoW": {
    geckoId: "ethereum-pow-iou",
    github: ['ethereumpoworg'],
    symbol: "ETHW",
    cmcId: "21296",
    categories: ["EVM"],
  },
  "Cube": {
    geckoId: "cube-network",
    github: ['cube-network'],
    symbol: "CUBE",
    cmcId: "20519",
    categories: ["EVM"],
    chainId: 1818,
  },
  "FunctionX": {
    geckoId: "fx-coin",
    github: ['FunctionX'],
    symbol: "FX",
    cmcId: "3884",
    categories: ["EVM"],
  },
  "Aptos": {
    geckoId: "aptos",
    github: ['aptos-labs'],
    symbol: "APT",
    cmcId: "21794",
  },
  "Kekchain": {
    geckoId: "kekchain",
    github: ['kek-chain'],
    symbol: "KEK",
    cmcId: "21606",
    categories: ["EVM"],
    chainId: 420420,
  },
  "Milkomeda A1": {
    geckoId: null,
    github: ['dcSpark'],
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Algorand",
      types: ["L2", "gas"]
    },
    chainId: 2002,
  },
  "Stride": {
    geckoId: "stride",
    github: ['Stride-Labs'],
    symbol: "STRD",
    cmcId: "21781",
    categories: ["Cosmos"],
  },
  "MUUCHAIN": {
    geckoId: "muu-inu",
    symbol: "MUU",
    cmcId: "22020",
    categories: ["EVM"],
    chainId: 20402,
  },
  "Injective": {
    geckoId: "injective-protocol",
    github: ['InjectiveLabs'],
    symbol: "INJ",
    cmcId: null,
    categories: ["Cosmos"],
  },
  "Step": {
    geckoId: "stepex",
    symbol: "SPEX",
    cmcId: "21725",
    categories: ["EVM"],
  },
  "TON": {
    geckoId: "the-open-network",
    github: ['ton-blockchain'],
    symbol: "TON",
    cmcId: "11419",
  },
  "Starknet": {
    geckoId: "starknet",
    github: ['starknet-io'],
    symbol: "STRK",
    cmcId: null,
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    governanceID: ["snapshot:starknet.eth"]
  },
  "Dexit": {
    geckoId: "dexit-finance",
    github: ['Dexit-Finance'],
    symbol: "DXT",
    cmcId: null,
    categories: ["EVM"],
  },
  "Empire": {
    geckoId: null,
    symbol: "EMPIRE",
    cmcId: null,
    categories: ["EVM"],
  },
  "Boba_Avax": {
    geckoId: null,
    github: ['bobanetwork'],
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
  },
  "Boba_Bnb": {
    geckoId: null,
    github: ['bobanetwork'],
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
  },
  "Comdex": {
    geckoId: "comdex",
    github: ['comdex-official'],
    symbol: "CMDX",
    cmcId: "14713",
    categories: ["Cosmos"],
  },
  "Flare": {
    geckoId: "flare-networks",
    github: ['flare-foundation'],
    symbol: "FLR",
    cmcId: "4172",
    categories: ["EVM"],
  },
  "Tlchain": {
    geckoId: "tlchain",
    github: ['TlChainNetwork'],
    symbol: "TLC",
    cmcId: null,
    categories: ["EVM"],
  },
  "Zeniq": {
    geckoId: null,
    symbol: "ZENIQ",
    cmcId: null,
    categories: ["EVM"],
  },
  "Omax": {
    geckoId: "omax-token",
    symbol: "OMAX",
    cmcId: "13916",
    categories: ["EVM"],
  },
  "Bitindi": {
    geckoId: "bitindi-chain",
    github: ['bitindi'],
    symbol: "BNI",
    cmcId: "22026",
    categories: ["EVM"],
  },
  "MAP Relay Chain": {
    geckoId: "marcopolo",
    symbol: "MAP",
    cmcId: "4956",
    categories: ["EVM"],
  },
  "Stargaze": {
    geckoId: "stargaze",
    github: ['public-awesome'],
    symbol: "STARS",
    cmcId: "16842",
    categories: ["Cosmos"],
  },
  "Libre": {
    geckoId: "libre",
    symbol: "LIBRE",
    cmcId: null,
  },
  "Umee": {
    geckoId: "umee",
    github: ['umee-network'],
    symbol: "UMEE",
    cmcId: "16389",
    categories: ["Cosmos"],
  },
  "WEMIX3.0": {
    geckoId: "wemix-token",
    github: ['wemixarchive'],
    symbol: "WEMIX",
    cmcId: "7548",
    categories: ["EVM"],
  },
  "Persistence": {
    geckoId: "persistence",
    github: ['persistenceOne'],
    symbol: "XPRT",
    cmcId: "7281",
    categories: ["Cosmos"],
  },
  "ENULS": {
    geckoId: null,
    github: ['nuls-io'],
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
  },
  "Oraichain": {
    geckoId: "oraichain-token",
    github: ['oraichain'],
    symbol: "ORAI",
    cmcId: "7533",
    categories: ["Cosmos"],
  },
  "Goerli": {
    geckoId: "goerli-eth",
    symbol: "GETH",
    cmcId: "23669",
    categories: ["EVM"],
  },
  "Europa": {
    geckoId: null,
    github: ['patractlabs'],
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
  },
  "CORE": {
    geckoId: "coredaoorg",
    github: ['coredao-org'],
    symbol: "CORE",
    cmcId: "23254",
    categories: ["EVM"],
  },
  "Rangers": {
    geckoId: "rangers-protocol-gas",
    symbol: "RPG",
    cmcId: "12221",
    categories: ["EVM"],
    governanceID: ["snapshot:rangersprotocoldao.eth"]
  },
  "Lung": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    chainId: 78887
  },
  "Loop": {
    geckoId: "loopnetwork",
    symbol: "LOOP",
    cmcId: "18761",
    categories: ["EVM"],
  },
  "Bone": {
    geckoId: null,
    symbol: "BONE",
    cmcId: null,
    categories: ["EVM"],
  },
  "zkSync Era": {
    geckoId: null,
    github: ['matter-labs'],
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 324,
  },
  "Polygon zkEVM": {
    geckoId: null,
    github: ['maticnetwork'],
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 1101
  },
  "Meta": {
    geckoId: "metadium",
    github: ['METADIUM'],
    symbol: "META",
    cmcId: "3418",
    categories: ["EVM"],
  },
  "Equilibrium": {
    geckoId: "equilibrium-token",
    github: ['equilibrium-eosdt'],
    symbol: "EQ",
    cmcId: "6780",
    categories: ["Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
  },
  "Regen": {
    geckoId: "regen",
    github: ['regen-network'],
    symbol: "REGEN",
    cmcId: "11646",
    categories: ["Cosmos"],
  },
  "EOS EVM": {
    geckoId: null,
    github: ['eosnetworkfoundation'],
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
  },
  "Quicksilver": {
    geckoId: "quicksilver",
    github: ['ingenuity-build'],
    symbol: "QCK",
    cmcId: null,
    categories: ["Cosmos"],
  },
  "Oasys": {
    geckoId: "oasys",
    github: ['oasysgames'],
    symbol: "OAS",
    cmcId: "22265",
    categories: ["EVM"],
  },
  "Migaloo": {
    geckoId: "white-whale",
    github: ['White-Whale-Defi-Platform'],
    symbol: "WHALE",
    cmcId: null,
    categories: ["Cosmos"],
  },
  "Sui": {
    geckoId: "sui",
    github: ['MystenLabs'],
    symbol: "SUI",
    cmcId: "20947",
  },
  "Grove": {
    geckoId: "grove",
    github: ['Grovetoken'],
    symbol: "GRV",
    cmcId: "23196",
    categories: ["EVM"]
  },
  "PulseChain": {
    geckoId: "pulsechain",
    symbol: "PLS",
    cmcId: null,
    categories: ["EVM"],
    chainid: 369
  },
  "XPLA": {
    geckoId: "xpla",
    symbol: "XPLA",
    cmcId: "22359",
    github: ["xpladev"],
    categories: ["Cosmos"],
  },
  "Neutron": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["Cosmos"],
  },
  "Onus": {
    geckoId: "onus",
    symbol: "ONUS",
    cmcId: "15261",
    categories: ["EVM"],
    github: ["ONUS-APP"]
  },
  "Pokt": {
    geckoId: "pocket-network",
    symbol: "POKT",
    cmcId: "11823",
    github: ["pokt-network"]
  },
  "Quasar": {
    geckoId: null,
    symbol: "QSR",
    cmcId: null,
    github: ["quasar-finance"],
    categories: ["Cosmos"],
  },
  "Concordium": {
    geckoId: "concordium",
    symbol: "CCD",
    cmcId: "18031",
    github: ["Concordium"]
  },
  "Chihuahua": {
    geckoId: "chihuahua-token",
    symbol: "HUAHUA",
    cmcId: "17208",
    github: ["ChihuahuaChain"],
    categories: ["Cosmos"],
  },
  "Rollux": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    github: ["SYS-Labs"],
    categories: ["EVM", "Rollup"],
    chainid: 570, 
    parent: {
      chain: "Syscoin",
      types: ["L2", "gas"]
    },
  },
  "Tenet": {
    geckoId: "tenet-1b000f7b-59cb-4e06-89ce-d62b32d362b9",
    symbol: "TENET",
    cmcId: "24892",
    github: ["tenet-org"],
    categories: ["EVM"],
  },
  "Mantle": {
    geckoId: "mantle",
    symbol: "MNT",
    cmcId: "27075",
    github: ["mantlenetworkio"],
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 5000,
  },
  "Neon": {
    geckoId: "neon",
    symbol: "NEON",
    cmcId: "26735",
    github: ["neonevm"],
    categories: ["EVM"],
    chainId: 245022934,
  },
  "Base": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    github: ["base-org"],
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 8453,
  },
  "Linea": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup"],
    github: ["ConsenSys"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
  },
  "GravityBridge": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["Cosmos"],
  },
  "Aura Network": {
    geckoId: "aura-network",
    symbol: "AURA",
    cmcId: "20326",
    categories: ["Cosmos"],
    github: ["aura-nw"]
  },
  "Sei": {
    geckoId: "sei-network",
    symbol: "SEI",
    cmcId: "23149",
    categories: ["Cosmos"],
    github: ["sei-protocol"]
  },
  "opBNB": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "BSC",
      types: ["L2", "gas"]
    },
    github: ['bnb-chain'],
    chainId: 204,
  },
  "Archway": {
    geckoId: "archway",
    symbol: "ARCH",
    cmcId: "27358",
    categories: ["Cosmos"],
    github: ["archway-network"]
  },
  "HydraDX": {
    geckoId: "hydradx",
    github: ['galacticcouncil'],
    symbol: "HDX",
    cmcId: "6753",
    categories: ["Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
  },
  "Shibarium": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
  },
  "MVC": {
    geckoId: "microvisionchain",
    symbol: "SPACE",
    cmcId: "24193",
    categories: ["Cosmos"],
  },
  "ALV": {
    geckoId: "alvey-chain",
    symbol: "ALV",
    cmcId: null,
    github: ["AlveyCoin"],
    categories: ["EVM"],
  },
  "DSC": {
    geckoId: "decimal",
    symbol: "DEL",
    cmcId: null,
    github: ["decimalteam"],
    categories: ["EVM"],
  },
  "Darwinia": {
    geckoId: "darwinia-network-native-token",
    symbol: "RING",
    cmcId: "5798",
    github: ["darwinia-network"],
    categories: ["EVM"],
  },
  "Pego": {
    geckoId: "pego-network-2",
    symbol: "PG",
    cmcId: "27723",
    categories: ["EVM"],
  },
  "Kroma": {
    geckoId: "kroma",
    symbol: "KRO",
    cmcId: null,
    categories: ["EVM"],
    github: ["kroma-network"],
  },
  "Manta": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    github: ['manta-network'],
    chainId: 169,
  },
  "ShimmerEVM": {
    geckoId: "shimmer",
    symbol: "SMR",
    cmcId: "14801",
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Shimmer",
      types: ["L2"]
    },
    github: ['iotaledger'],
    chainId: 148,
  },
  "Beam": {
    geckoId: null,
    github: ['Merit-Circle'],
    symbol: "MC",
    cmcId: null,
    categories: ["EVM"],
    parent: {
      chain: "Avalanche",
      types: ["subnet"]
    },
    chainId: 4337,
  },
  "NOS": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
  },
  "Scroll": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup"],
    github: ["scroll-tech"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 534352,
  },
  "RENEC": {
    geckoId: "renec",
    symbol: "RENEC",
    cmcId: "24143",
    github: ["renec-chain"]
  },
  "Bifrost Network": {
    geckoId: "bifrost",
    symbol: "BFC",
    cmcId: "7817",
    categories: ["EVM"],
    github: ["bifrost-platform"]
  },
  "Radix": {
    geckoId: "radix",
    symbol: "XRD",
    cmcId: "11948",
    github: ["radixdlt"]
  },
  "Nolus": {
    geckoId: "nolus",
    symbol: "NLS",
    cmcId: null,
    categories: ["Cosmos"],
    github: ["nolus-protocol"]
  },
  "ETHF": {
    geckoId: "ethereumfair",
    symbol: "ETHF",
    cmcId: "21842",
    categories: ["EVM"],
    github: ["ethereumfair"],
  },
  "MEER": {
    geckoId: "qitmeer-network",
    symbol: "MEER",
    cmcId: "15658",
    categories: ["EVM"],
  },
  "Elysium": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
  },
  "Horizen EON": {
    geckoId: "zencash",
    symbol: "ZEN",
    cmcId: null,
    categories: ["EVM"],
    chainId: 7332,
  },
  "Chiliz": {
    geckoId: "chiliz",
    symbol: "CHZ",
    cmcId: "4066",
    categories: ["EVM"],
    chainId: 88888,
  },
  "LightLink": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 1890
  }
} as unknown as {
  [chain: string]: {
    geckoId: string | null,
    symbol: string | null,
    cmcId: string | null,
    categories?: string[],
    chainId?: number,
    parent?: {
      chain: string,
      types: string[]
    }
  }
}
chainCoingeckoIds["xDai"] = chainCoingeckoIds["Gnosis"]
chainCoingeckoIds["Binance"] = chainCoingeckoIds["BSC"]
chainCoingeckoIds["Kucoin"] = chainCoingeckoIds["KCC"]
chainCoingeckoIds["Cosmos"] = chainCoingeckoIds["CosmosHub"]
chainCoingeckoIds["Terra"] = chainCoingeckoIds["Terra Classic"]
chainCoingeckoIds["Nova"] = chainCoingeckoIds["Nova Network"]
chainCoingeckoIds["Milkomeda"] = chainCoingeckoIds["Milkomeda C1"]
chainCoingeckoIds["Elrond"] = chainCoingeckoIds["MultiversX"]
chainCoingeckoIds["RSK"] = chainCoingeckoIds["Rootstock"]
chainCoingeckoIds["OKExChain"] = chainCoingeckoIds["OKTChain"]
chainCoingeckoIds["Map"] = chainCoingeckoIds["MAP Relay Chain"]
chainCoingeckoIds["Pulse"] = chainCoingeckoIds["PulseChain"]
chainCoingeckoIds["WEMIX"] = chainCoingeckoIds["WEMIX3.0"]


export const extraSections = ["staking", "pool2", "offers", "borrowed", "treasury", "vesting"]

export function transformNewChainName(chain: string) {
  switch (chain) {
    case "Binance":
      return "BSC"
    case "Kucoin":
      return "KCC"
    case "OKExChain":
      return "OKTChain"
    case "xDai":
      return "Gnosis"
    case "Cosmos":
      return "CosmosHub"
    case "Terra":
      return "Terra Classic"
    case "Nova":
      return "Nova Network"
    case "godwoken_v1":
      return "GodwokenV1"
    case "arbitrum_nova":
      return "Arbitrum Nova"
    case "Milkomeda":
      return "Milkomeda C1"
    case "Elrond":
      return "MultiversX"
    case "RSK":
      return "Rootstock"
    case "Orai":
      return "Oraichain"
    case "zkSync":
      return "zkSync Lite"
    case "polygon_zkevm":
      return "Polygon zkEVM"
    case "eos_evm":
      return "EOS EVM"
    case "Map":
      return "MAP Relay Chain"
    case "Pulse":
      return "PulseChain"
    case "Op_Bnb":
        return "opBNB"
    case "WEMIX":
      return "WEMIX3.0"
    default:
      return chain
  }
}

export function getChainDisplayName(normalizedChain: string, useNewChainNames: boolean): string {
  if (extraSections.includes(normalizedChain)) {
    return normalizedChain
  }
  if (normalizedChain.includes('-')) {
    return normalizedChain.split('-').map(chain => getChainDisplayName(chain, useNewChainNames)).join('-')
  }
  switch (normalizedChain) {
    case "bsc":
      return useNewChainNames ? "BSC" : "Binance"
    case "wan":
      return "Wanchain"
    case "kcc":
      return useNewChainNames ? "KCC" : "Kucoin"
    case "okexchain":
      return useNewChainNames ? "OKTChain" : "OKExChain"
    case "xdai":
      return useNewChainNames ? "Gnosis" : "xDai"
    case "cosmos":
      return useNewChainNames ? "CosmosHub" : "Cosmos"
    case "terra":
      return useNewChainNames ? "Terra Classic" : "Terra"
    case "nova":
      return useNewChainNames ? "Nova Network" : "Nova Network"
    case "godwoken_v1":
      return useNewChainNames ? "GodwokenV1" : "GodwokenV1"
    case "elrond":
      return useNewChainNames ? "MultiversX" : "Elrond"
    case "rsk":
      return useNewChainNames ? "Rootstock" : "RSK"
    case "pulse":
      return useNewChainNames ? "PulseChain" : "Pulse"
    case "avax":
      return "Avalanche"
    case "xdaiarb":
      return "XdaiArb"
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
      return "Sora"
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
    case "zksync":
      return useNewChainNames ? "zkSync Lite" : "zkSync"
    case "zksync era":
      return "zkSync Era"
    case "bifrost network":
      return "Bifrost Network"
    case "horizen eon":
      return "Horizen EON"    
    case "godwoken":
      return "Godwoken"
    case "callisto":
      return "Callisto"
    case "csc":
      return "CSC"
    case "ergo":
      return "Ergo"
    case "parallel":
      return "Parallel"
    case "oasis":
      return "Oasis"
    case "theta":
      return "Theta"
    case "meter":
      return "Meter"
    case "syscoin":
      return "Syscoin"
    case "moonbeam":
      return "Moonbeam"
    case "astar":
      return "Astar"
    case "curio":
      return "Curio"
    case "skale":
      return "SKALE"
    case "bittorrent":
      return "Bittorrent"
    case "genshiro":
      return "Genshiro"
    case "wax":
      return "Wax"
    case "evmos":
      return "Evmos"
    case "proton":
      return "Proton"
    case "kadena":
      return "Kadena"
    case "vite":
      return "Vite"
    case "milkomeda":
      return useNewChainNames ? "Milkomeda C1" : "Milkomeda"
    case "dfk":
      return "DFK"
    case "clv":
      return "CLV"
    case "rei":
      return "REI"
    case "crab":
      return "Crab"
    case "hedera":
      return "Hedera"
    case "findora":
      return "Findora"
    case "hydra":
      return "Hydra"
    case "bitgert":
      return "Bitgert"
    case "reef":
      return "Reef"
    case "candle":
      return "Candle"
    case "bifrost":
      return "Bifrost"
    case "stafi":
      return "Stafi"
    case "lachain":
      return "Lachain"
    case "coti":
      return "Coti"
    case "bitcoincash":
      return "Bitcoincash"
    case "litcoin":
      return "Litecoin"
    case "doge":
      return "Doge"
    case "obyte":
      return "Obyte"
    case "reichain":
      return "REIchain"
    case "ontology_evm":
      return "OntologyEVM"
    case "carbon":
      return "Carbon"
    case "neo3":
      return "Neo3"
    case "palette":
      return "Pallete"
    case "bytomsidechain":
      return "Bytomsidechain"
    case "starcoin":
      return "Starcoin"
    case "terra2":
      return "Terra2"
    case "sx":
      return "SXnetwork"
    case "echelon":
      return "Echelon"
    case "multivac":
      return "MultiVAC"
    case "ore":
      return "ORE"
    case "lbry":
      return "LBRY"
    case "rvn":
      return "Ravencoin"
    case "acala":
      return "Acala"
    case "icp":
      return "ICP"
    case "kintsugi":
      return "Kintsugi"
    case "filecoin":
      return "Filecoin"
    case "flow":
      return "Flow"
    case "kujira":
      return "Kujira"
    case "heiko":
      return "Heiko"
    case "posichain":
      return "Posichain"
    case "dogechain":
      return "Dogechain"
    case "canto":
      return "Canto"
    case "ripple":
      return "Ripple"
    case "godwokenv1":
      return "GodwokenV1"
    case "arbitrum_nova":
      return "Arbitrum Nova"
    case "ultron":
      return "Ultron"
    case "interlay":
      return "Interlay"
    case "juno":
      return "Juno"
    case "tombchain":
      return "Tombchain"
    case "crescent":
      return "Crescent"
    case "vision":
      return "Vision"
    case "ethpow":
      return "EthereumPoW"
    case "cube":
      return "Cube"
    case "functionx":
      return "FunctionX"
    case "aptos":
      return "Aptos"
    case "kekchain":
      return "Kekchain"
    case "milkomeda_a1":
      return "Milkomeda A1"
    case "stride":
      return "Stride"
    case "muuchain":
      return "MUUCHAIN"
    case "injective":
      return "Injective"
    case "step":
      return "Step"
    case "ton":
      return "TON"
    case "starknet":
      return "Starknet"
    case "dexit":
      return "Dexit"
    case "empire":
      return "Empire"
    case "boba_avax":
      return "Boba_Avax"
    case "boba_bnb":
      return "Boba_Bnb"
    case "comdex":
      return "Comdex"
    case "flare":
      return "Flare"
    case "tlchain":
      return "Tlchain"
    case "zeniq":
      return "Zeniq"
    case "omax":
      return "Omax"
    case "bitindi":
      return "Bitindi"
    case "map":
      return useNewChainNames ? "MAP Relay Chain" : "Map"
    case "stargaze":
      return "Stargaze"
    case "libre":
      return "Libre"
    case "umee":
      return "Umee"
    case "wemix":
      return useNewChainNames ? "WEMIX3.0" : "WEMIX"
    case "persistence":
      return "Persistence"
    case "enuls":
      return "ENULS"
    case "orai":
      return useNewChainNames ? "Oraichain" : "Orai"
    case "goerli":
      return "Goerli"
    case "europa":
      return "Europa"
    case "core":
      return "CORE"
    case "rpg":
      return "Rangers"
    case "lung":
      return "Lung"
    case "loop":
      return "Loop"
    case "bone":
      return "Bone"
    case "era":
      return "zkSync Era"
    case "bfc":
      return "Bifrost Network"
    case "polygon_zkevm":
      return "Polygon zkEVM"
    case "meta":
      return "Meta"
    case "equilibrium":
      return "Equilibrium"
    case "regen":
      return "Regen"
    case "eos_evm":
      return "EOS EVM"
    case "quicksilver":
      return "Quicksilver"
    case "oas":
      return "Oasys"
    case "migaloo":
      return "Migaloo"
    case "sui":
      return "Sui"
    case "grove":
      return "Grove"
    case "xpla":
      return "XPLA"
    case "neutron":
      return "Neutron"
    case "onus":
      return "Onus"
    case "pokt":
      return "Pokt"
    case "quasar":
      return "Quasar"
    case "concordium":
      return "Concordium"
    case "chihuahua":
      return "Chihuahua"
    case "rollux":
      return "Rollux"
    case "tenet":
      return "Tenet"
    case "mantle":
      return "Mantle"
    case "neon_evm":
      return "Neon"
    case "base":
      return "Base"
    case "linea":
      return "Linea"
    case "gravitybridge":
      return "GravityBridge"
    case "aura":
      return "Aura Network"
    case "sei":
      return "Sei"
    case "op_bnb":
      return useNewChainNames ? "opBNB" : "op_bnb"
    case "archway":
      return "Archway"
    case "hydradx":
      return "HydraDX"
    case "shibarium":
      return "Shibarium"
    case "mvc":
      return "MVC"
    case "alv":
      return "ALV"
    case "dsc":
      return "DSC"
    case "darwinia":
      return "Darwinia"
    case "pg":
      return "Pego"
    case "kroma":
      return "Kroma" 
    case "manta":
      return "Manta"
    case "shimmer_evm":
      return "ShimmerEVM"       
    case "beam":
      return "Beam"
    case "nos":
      return "NOS"  
    case "scroll":
      return "Scroll"
    case "renec":
      return "RENEC" 
    case "radixdlt":
      return "Radix"
    case "nolus":
      return "Nolus"
    case "ethf":
      return "ETHF"
    case "meer":
      return "MEER"
    case "elsm":
      return "Elysium"
    case "eon":
      return "Horizen EON"
    case "chz":
      return "Chiliz"
    case "lightlink_phoenix":
      return "LightLink"
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

const chainIdToNameMap = {} as {
  [id: string]: string
}

Object.entries(chainCoingeckoIds).forEach(([chain, obj]) => chainIdToNameMap[obj.chainId + ''] = chain)

export function getChainNameFromId(id: string | number | undefined) {
  return chainIdToNameMap['' + id]
}
