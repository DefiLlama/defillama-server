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
  "map protocol": "map",
  "pulsechain": "pulse",
  "opbnb": "op_bnb",
  "bifrost network": "bfc",
  "horizen eon": "eon",
  "bahamut": "ftn",
  "bevm": "chainx",
  "bitnet": "btn",
  "defichain evm": "defichain_evm",
  "hydration": "hydradx",
  "zklink nova": "zklink",
  "bitlayer": "btr",
  "cronos zkevm": "cronos_zkevm"
} as {
  [chain: string]: string
}

export function normalizeChain(chain: string) {
  let normalizedChain = chain.toLowerCase();
  return normalizedChainReplacements[normalizedChain] ?? normalizedChain;
}

export function isDoubleCounted(moduleDoubleCounted?: boolean, category?: string) {
  return moduleDoubleCounted === true || (category === "Yield Aggregator" || category === "Yield");
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

export type ChainCoinGekcoId = {
  geckoId: string | null,
  symbol: string | null,
  cmcId: string | null,
  categories?: string[],
  chainId?: number,
  twitter?: string | null;
  url?: string | null;
  parent?: {
    chain: string,
    types: string[]
  }
}

export type ChainCoinGekcoIds = {
  [chain: string]: ChainCoinGekcoId
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
    twitter: "ethereum",
    url: "https://ethereum.foundation/"
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
    twitter: "arbitrum",
    url: "https://arbitrum.io/"
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
    categories: ["EVM", "Rollup", "Superchain"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 10,
    governanceID: ["snapshot:opcollective.eth", "eip155:10:0xcDF27F107725988f2261Ce2256bDfCdE8B382B10"],
    github: ['ethereum-optimism'],
    twitter: "Optimism",
    url: "https://www.optimism.io/"
  },
  "Stacks": {
    geckoId: "blockstack",
    symbol: "STX",
    cmcId: "4847",
    github: ['stacks-network'],
    twitter: "Stacks",
    categories: ["Bitcoin Sidechains"],
    url: "https://www.stacks.co/"
  },
  "PolyNetwork": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    github: ['polynetwork'],
    twitter: "PolyNetwork2",
    url: "https://www.poly.network/#/"
  },
  "Conflux": {
    geckoId: "conflux-token",
    symbol: "CFX",
    cmcId: "7334",
    github: ['Conflux-Chain'],
    twitter: "Conflux_Network",
    url: "https://confluxnetwork.org/"
  },
  "Nuls": {
    geckoId: "nuls",
    symbol: "NULS",
    cmcId: "2092",
    github: ['nuls-io'],
    twitter: "Nuls",
    url: "https://nuls.io/"
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
    twitter: "BNBCHAIN",
    url: "https://www.bnbchain.org/en"
  },
  "Avalanche": {
    geckoId: "avalanche-2",
    symbol: "AVAX",
    cmcId: "5805",
    categories: ["EVM"],
    github: ['ava-labs'],
    chainId: 43114,
    twitter: "avax",
    url: "https://www.avax.network/"
  },
  "Solana": {
    geckoId: "solana",
    symbol: "SOL",
    cmcId: "5426",
    github: ['solana-labs'],
    twitter: "solana",
    url: "https://solana.com/"
  },
  "Polygon": {
    geckoId: "matic-network",
    symbol: "MATIC",
    cmcId: "3890",
    categories: ["EVM"],
    chainId: 137,
    github: ['maticnetwork'],
    twitter: "0xPolygon",
    url: "https://polygon.technology/"
  },
  "Terra Classic": {
    geckoId: "terra-luna",
    symbol: "LUNC",
    cmcId: "4172",
    categories: ["Cosmos"],
    github: ['terra-money'],
    twitter: "terra_money",
    url: "https://www.terra.money/"
  },
  "Fantom": {
    geckoId: "fantom",
    symbol: "FTM",
    cmcId: "3513",
    categories: ["EVM"],
    chainId: 250,
    github: ['Fantom-foundation'],
    twitter: "FantomFDN",
    url: "https://fantom.foundation/"
  },
  "Gnosis": {
    geckoId: "gnosis",
    symbol: "GNO",
    cmcId: "1659",
    categories: ["EVM"],
    chainId: 100,
    governanceID: ["snapshot:xdaistake.eth"],
    github: ['gnosis'],
    twitter: "gnosischain",
    url: "https://www.gnosis.io/"
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
    twitter: "HECO_Chain",
    url: "https://hecochain.com/"
  },
  "Kava": {
    geckoId: "kava",
    github: ['Kava-Labs'],
    symbol: "KAVA",
    cmcId: "4846",
    categories: ["EVM", "Cosmos"],
    twitter: "KAVA_CHAIN",
    url: "https://www.kava.io/"
  },
  "OKTChain": {
    geckoId: "oec-token",
    github: ['okx'],
    symbol: "OKT",
    cmcId: "8267",
    categories: ["EVM", "Cosmos"],
    chainId: 66,
    twitter: "OKCNetwork",
    url: "https://www.okx.com/oktc"
  },
  "Wanchain": {
    geckoId: "wanchain",
    github: ['wanchain'],
    symbol: "WAN",
    cmcId: "2606",
    categories: ["EVM"],
    chainId: 888,
    twitter: "wanchain_org",
    url: "https://www.wanchain.org/"
  },
  "Posichain": {
    geckoId: "position-token",
    github: ['PositionExchange'],
    symbol: "POSI",
    cmcId: "11234",
    categories: ["EVM"],
    chainId: 900000,
    twitter: "POSIChainOrg",
    url: "https://www.posichain.org/"
  },
  "DefiChain": {
    geckoId: "defichain",
    github: ['DeFiCh'],
    symbol: "DFI",
    cmcId: "5804",
    twitter: "defichain",
    url: "https://defichain.com/"
  },
  "Ontology": {
    geckoId: "ontology",
    github: ['ontio'],
    symbol: "ONT",
    cmcId: "2566",
    twitter: "OntologyNetwork",
    url: "https://ont.io/"
  },
  "Bitcoin": {
    geckoId: "bitcoin",
    symbol: "BTC",
    cmcId: "1",
    twitter: "Bitcoin",
    url: "https://bitcoin.org/en/"
  },
  "Energi": {
    geckoId: "energi",
    github: ['energicryptocurrency'],
    symbol: "NRG",
    cmcId: "3218",
    categories: ["EVM"],
    chainId: 39797,
    twitter: "energi",
    url: "https://energi.world/"
  },
  "Secret": {
    geckoId: "secret",
    github: ['scrtlabs'],
    symbol: "SCRT",
    cmcId: "5604",
    categories: ["Cosmos"],
    twitter: "SecretNetwork",
    url: "https://scrt.network/"
  },
  "Zilliqa": {
    geckoId: "zilliqa",
    github: ['Zilliqa'],
    symbol: "ZIL",
    cmcId: "2469",
    twitter: "zilliqa",
    url: "https://www.zilliqa.com/"
  },
  "NEO": {
    geckoId: "neo",
    github: ['neo-project'],
    symbol: "NEO",
    cmcId: "1376",
    twitter: "Neo_Blockchain",
    url: "https://neo.org/"
  },
  "Harmony": {
    geckoId: "harmony",
    github: ['harmony-one'],
    symbol: "ONE",
    cmcId: "3945",
    categories: ["EVM"],
    chainId: 1666600000,
    governanceID: ["snapshot:harmony-mainnet.eth"],
    twitter: "harmonyprotocol",
    url: "https://harmony.one/"
  },
  "Rootstock": {
    geckoId: "rootstock",
    github: ['rsksmart'],
    symbol: "RBTC",
    cmcId: "3626",
    categories: ["EVM","Bitcoin Sidechains"],
    parent: {
      chain: "Bitcoin",
      types: ["gas"]
    },
    chainId: 30,
    twitter: "rootstock_io",
    url: "https://rootstock.io/"
  },
  "Sifchain": {
    geckoId: "sifchain",
    github: ['Sifchain'],
    symbol: "EROWAN",
    cmcId: "8541",
    categories: ["Cosmos"],
    twitter: "sifchain",
    url: "https://sifchain.network/"
  },
  "Algorand": {
    geckoId: "algorand",
    github: ['algorand'],
    symbol: "ALGO",
    cmcId: "4030",
    twitter: "Algorand",
    url: "https://developer.algorand.org/"
  },
  "Osmosis": {
    geckoId: "osmosis",
    github: ['osmosis-labs'],
    symbol: "OSMO",
    cmcId: "12220",
    categories: ["Cosmos"],
    twitter: "osmosiszone",
    url: "https://osmosis.zone/"
  },
  "Thorchain": {
    geckoId: "thorchain",
    github: ['thorchain'],
    symbol: "RUNE",
    cmcId: "4157",
    categories: ["Cosmos"],
    twitter: "THORChain",
    url: "https://thorchain.org/"
  },
  "Tron": {
    geckoId: "tron",
    github: ['tronprotocol'],
    symbol: "TRON",
    cmcId: "1958",
    categories: ["EVM"],
    twitter: "trondao",
    url: "https://trondao.org/"
  },
  "Icon": {
    geckoId: "icon",
    github: ['icon-project'],
    symbol: "ICX",
    cmcId: "2099",
    twitter: "helloiconworld",
    url: "https://icon.community/"
  },
  "Tezos": {
    geckoId: "tezos",
    github: ['tezos'],
    symbol: "XTZ",
    cmcId: "2011",
    twitter: "tezos",
    url: "https://tezos.com/"
  },
  "Celo": {
    geckoId: "celo",
    github: ['celo-org'],
    symbol: "CELO",
    cmcId: "5567",
    categories: ["EVM"],
    chainId: 42220,
    twitter: "Celo",
    url: "https://celo.org/"
  },
  "KCC": {
    geckoId: "kucoin-shares",
    github: ['kcc-community'],
    symbol: "KCS",
    cmcId: "2087",
    categories: ["EVM"],
    chainId: 321,
    governanceID: ["snapshot:kcc.eth"],
    twitter: "KCCOfficialTW",
    url: "https://www.kcc.io/"
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
    twitter: "KaruraNetwork",
    url: "https://acala.network/karura"
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
    twitter: "MoonriverNW",
    url: "https://moonbeam.network/networks/moonriver/"
  },
  "Waves": {
    geckoId: "waves",
    github: ['wavesplatform'],
    symbol: "WAVES",
    cmcId: "1274",
    twitter: "wavesprotocol",
    url: "https://waves.tech/"
  },
  "Kaia": { // previously Klaytn
    geckoId: "klay-token",
    github: ['kaiachain'],
    symbol: "KLAY",
    cmcId: "4256",
    categories: ["EVM"],
    chainId: 8217,
    twitter: "kaiachain",
    url: "https://kaia.io/"
  },
  "IoTeX": {
    geckoId: "iotex",
    github: ['iotexproject'],
    symbol: "IOTX",
    cmcId: "2777",
    categories: ["EVM"],
    chainId: 4689,
    governanceID: ["snapshot:iotex.eth"],
    twitter: "iotex_io",
    url: "https://iotex.io/"
  },
  "Ultra": {
    geckoId: "ultra",
    github: ['ultraio'],
    symbol: "UOS",
    cmcId: "4189",
    twitter: "ultra_io",
    url: "https://ultra.io/"
  },
  "Kusama": {
    geckoId: "kusama",
    github: ['paritytech'],
    symbol: "KSM",
    cmcId: "5034",
    twitter: "kusamanetwork",
    url: "https://kusama.network/"
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
    twitter: "ShidenNetwork",
    url: "https://shiden.astar.network/"
  },
  "Telos": {
    geckoId: "telos",
    github: ['telosnetwork'],
    symbol: "TLOS",
    cmcId: "4660",
    categories: ["EVM"],
    chainId: 40,
    twitter: "HelloTelos",
    url: "https://www.telos.net/"
  },
  "ThunderCore": {
    geckoId: "thunder-token",
    github: ['thundercore'],
    symbol: "TT",
    cmcId: "3930",
    categories: ["EVM"],
    chainId: 108,
    governanceID: ["snapshot:thundercorelabs.eth"],
    twitter: "ThunderCoreLab",
    url: "https://www.thundercore.com/"
  },
  "Lamden": {
    geckoId: "lamden",
    github: ['Lamden'],
    symbol: "TAU",
    cmcId: "2337",
    twitter: "LamdenTau",
  },
  "Near": {
    geckoId: "near",
    github: ['near'],
    symbol: "NEAR",
    cmcId: "6535",
    twitter: "NEARProtocol",
    url: "https://near.org/"
  },
  "EOS": {
    geckoId: "eos",
    github: ['EOSIO'],
    symbol: "EOS",
    cmcId: "1765",
    twitter: "EOSNetworkFDN",
    url: "https://eosnetwork.com/"
  },
  "Songbird": {
    geckoId: "songbird",
    github: ['GateHubNet'],
    symbol: "SGB",
    cmcId: "12186",
    categories: ["EVM"],
    chainId: 19,
    twitter: "FlareNetworks",
    url: "https://flare.network/"
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
    twitter: "energywebx",
    url: "https://www.energyweb.org/"
  },
  "HPB": {
    geckoId: "high-performance-blockchain",
    github: ['hpb-project'],
    symbol: "HPB",
    cmcId: "2345",
    categories: ["EVM"],
    chainId: 269,
    governanceID: ["snapshot:xinlian.eth"],
    twitter: "HPB_Global",
    url: "https://www.hpb.io/"
  },
  "GoChain": {
    geckoId: "gochain",
    github: ['gochain'],
    symbol: "GO",
    cmcId: "2861",
    categories: ["EVM"],
    chainId: 60,
    twitter: "go_chain",
    url: "https://gochain.io/"
  },
  "Viction": { // previously TomoChain
    geckoId: "tomochain",
    github: ['tomochain','BuildOnViction'],
    symbol: "VIC",
    cmcId: "2570",
    categories: ["EVM"],
    chainId: 88,
    twitter: "BuildOnViction",
    url: "https://viction.xyz/"
  },
  "Fusion": {
    geckoId: "fsn",
    github: ['fsn-dev'],
    symbol: "FSN",
    cmcId: "2530",
    categories: ["EVM"],
    chainId: 32659,
    twitter: "FUSIONProtocol",
    url: "https://www.fusion.org/en"
  },
  "Kardia": {
    geckoId: "kardiachain",
    github: ['kardiachain'],
    symbol: "KAI",
    cmcId: "5453",
    categories: ["EVM"],
    chainId: 0,
    twitter: "KardiaChain",
    url: "https://kardiachain.io/"
  },
  "Fuse": {
    geckoId: "fuse-network-token",
    github: ['fuseio'],
    symbol: "FUSE",
    cmcId: "5634",
    categories: ["EVM"],
    chainId: 122,
    governanceID: ["snapshot:fusedao.eth"],
    twitter: "Fuse_network",
    url: "https://www.fuse.io/"
  },
  "Elastos": {
    geckoId: "elastos",
    github: ['elastos'],
    symbol: "ELA",
    cmcId: "2492",
    categories: ["EVM"],
    chainId: 20,
    twitter: "ElastosInfo",
    url: "https://elastos.info/"
  },
  "Hoo": {
    geckoId: "hoo-token",
    github: ['hoosmartchain'],
    symbol: "HOO",
    cmcId: "7543",
    categories: ["EVM"],
    chainId: 70,
    twitter: "HooSmartChain",
    url: "https://www.hoosmartchain.com/"
  },
  "Cronos": {
    geckoId: "crypto-com-chain",
    github: ['crypto-org-chain'],
    symbol: "CRO",
    cmcId: "3635",
    categories: ["EVM", "Cosmos"],
    chainId: 25,
    twitter: "cronos_chain",
    url: "https://cronos.org/"
  },
  "Polis": {
    geckoId: "polis",
    github: ['polischain'],
    symbol: "POLIS",
    cmcId: "2359",
    categories: ["EVM"],
    chainId: 333999,
    governanceID: ["snapshot:polis-dao.eth"],
    twitter: "PolisChain",
  },
  "ZYX": {
    geckoId: "zyx",
    github: ['ZYXnetwork'],
    symbol: "ZYX",
    cmcId: "6131",
    categories: ["EVM"],
    chainId: 55,
    twitter: "zyx__network",
    url: "https://zyx.network/"
  },
  "MultiversX": {
    geckoId: "elrond-erd-2",
    github: ['multiversx'],
    symbol: "EGLD",
    cmcId: "6892",
    twitter: "MultiversX",
    url: "https://multiversx.com/"
  },
  "Stellar": {
    geckoId: "stellar",
    github: ['stellar'],
    symbol: "XLM",
    cmcId: "512",
    twitter: "StellarOrg",
    url: "https://stellar.org/"
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
    twitter: "bobanetwork",
    url: "https://boba.network/"
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
    governanceID: ["snapshot:metislayer2.eth"],
    twitter: "MetisL2",
    url: "https://www.metis.io/"
  },
  "Ubiq": {
    geckoId: "ubiq",
    github: ['ubiq'],
    symbol: "UBQ",
    cmcId: "588",
    categories: ["EVM"],
    chainId: 8,
    governanceID: ["snapshot:ubiq.eth"],
    twitter: "ubiqsmart",
    url: "https://ubiqsmart.com/"
  },
  "Mixin": {
    geckoId: "mixin",
    github: ['MixinNetwork'],
    symbol: "XIN",
    cmcId: "2349",
    twitter: "MixinKernel",
    url: "https://mixin.network/"
  },
  "Everscale": {
    geckoId: "everscale",
    github: ['everscale-org'],
    symbol: "EVER",
    cmcId: "7505",
    twitter: "Everscale_net",
    url: "https://everscale.network/"
  },
  "VeChain": {
    geckoId: "vechain",
    github: ['vechain'],
    symbol: "VET",
    cmcId: "3077",
    twitter: "vechainofficial",
    url: "https://www.vechain.org/"
  },
  "XDC": {
    geckoId: "xdce-crowd-sale",
    github: ['XDCFoundation'],
    symbol: "XDC",
    cmcId: "2634",
    twitter: "XinFin_Official",
    url: "https://xinfin.org/"
  },
  "Velas": {
    geckoId: "velas",
    github: ['velas'],
    symbol: "VLX",
    cmcId: "4747",
    categories: ["EVM"],
    chainId: 106,
    governanceID: ["snapshot:velascommunity.eth"],
    twitter: "VelasBlockchain",
    url: "https://velas.com/en"
  },
  "Polkadot": {
    geckoId: "polkadot",
    symbol: "DOT",
    cmcId: "6636",
    github: ['paritytech'],
    twitter: "Polkadot",
    url: "https://polkadot.network/"
  },
  "CosmosHub": {
    geckoId: "cosmos",
    github: ['cosmos'],
    symbol: "ATOM",
    cmcId: "3794",
    twitter: "cosmos",
    url: "https://cosmos.network/"
  },
  "EthereumClassic": {
    geckoId: "ethereum-classic",
    github: ['ethereumclassic'],
    symbol: "ETC",
    cmcId: "1321",
    categories: ["EVM"],
    chainId: 61,
    twitter: "eth_classic",
    url: "https://ethereumclassic.org/"
  },
  "Sora": {
    geckoId: "sora",
    github: ['sora-xor'],
    symbol: "XOR",
    cmcId: "5802",
    twitter: "sora_xor",
    url: "https://sora.org/"
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
    twitter: "auroraisnear",
    url: "https://aurora.dev/"
  },
  "Ronin": {
    geckoId: null,
    github: ['axieinfinity'],
    symbol: "RON",
    cmcId: null,
    categories: ["EVM"],
    chainId: 2020,
    twitter: "Ronin_Network",
    url: "https://roninchain.com/"
  },
  "smartBCH": {
    geckoId: "bitcoin-cash",
    github: ['smartbch'],
    symbol: "BCH",
    cmcId: "1831",
    categories: ["EVM"],
    chainId: 10000,
    twitter: "SmartBCH",
    url: "https://smartbch.org/"
  },
  "ZKsync Lite": {
    geckoId: null,
    github: ['matter-labs'],
    symbol: null,
    cmcId: null,
    categories: ["Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    twitter: "zksync",
    url: "https://zksync.io/"
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
    twitter: "GodwokenRises",
    url: "https://godwoken.com/"
  },
  "Callisto": {
    geckoId: "callisto",
    github: ['CallistoNetwork'],
    symbol: "CLO",
    cmcId: "2757",
    categories: ["EVM"],
    chainId: 820,
    twitter: "CallistoSupport",
    url: "https://callisto.network/"
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
    twitter: "ergo_platform",
    url: "https://ergoplatform.org/en/"
  },
  "Cardano": {
    geckoId: "cardano",
    github: ['cardano-foundation'],
    symbol: "ADA",
    cmcId: "2010",
    twitter: "Cardano",
    url: "https://cardano.org/"
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
    twitter: "Nahmii_io",
    url: "https://www.nahmii.io/"
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
    twitter: "ParallelFi",
    url: "https://parallel.fi/"
  },
  "Meter": {
    geckoId: "meter",
    github: ['meterio'],
    symbol: "MTRG",
    cmcId: "5919",
    categories: ["EVM"],
    chainId: 82,
    governanceID: ["snapshot:meter-mainnet.eth"],
    twitter: "Meter_IO",
    url: "https://meter.io/"
  },
  "Oasis Emerald": {
    geckoId: "oasis-network",
    github: ['oasisprotocol'],
    symbol: "ROSE",
    cmcId: "7653",
    categories: ["EVM"],
    chainId: 42262,
    twitter: "OasisProtocol",
    url: "https://oasisprotocol.org/"
  },
  "Theta": {
    geckoId: "theta-token",
    github: ['thetatoken'],
    symbol: "THETA",
    cmcId: "2416",
    categories: ["EVM"],
    chainId: 361,
    twitter: "Theta_Network",
    url: "https://thetatoken.org/"
  },
  "Syscoin": {
    geckoId: "syscoin",
    github: ['syscoin'],
    symbol: "SYS",
    cmcId: "541",
    categories: ["EVM"],
    chainId: 57,
    twitter: "syscoin",
    url: "https://syscoin.org/"
  },
  "Moonbeam": {
    geckoId: "moonbeam",
    github: ['moonbeam-foundation'],
    symbol: "GLMR",
    cmcId: "6836",
    categories: ["EVM", "Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
    chainId: 1284,
    governanceID: ["snapshot:moonbeam-foundation.eth"],
    twitter: "MoonbeamNetwork",
    url: "https://moonbeam.network/"
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
    twitter: "AstarNetwork",
    url: "https://unstoppable.astar.network/"
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
    governanceID: ["snapshot:curiotools.eth"],
  },
  "SKALE": {
    geckoId: "skale",
    github: ['skalenetwork'],
    symbol: "SKL",
    cmcId: "5691",
    categories: ["EVM"],
    twitter: "SkaleNetwork",
    url: "https://skale.space/"
  },
  "Bittorrent": {
    geckoId: "bittorrent",
    github: ['bttcprotocol'],
    symbol: "BTT",
    cmcId: "16086",
    categories: ["EVM"],
    chainId: 199,
    twitter: "BitTorrent",
    url: "https://bt.io/"
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
    twitter: "GenshiroDeFi",
    url: "https://genshiro.io/"
  },
  "Wax": {
    geckoId: "wax",
    github: ['worldwide-asset-exchange'],
    symbol: "WAXP",
    cmcId: "2300",
    twitter: "WAX_io",
    url: "https://www.wax.io/"
  },
  "Evmos": {
    geckoId: "evmos",
    github: ['evmos'],
    symbol: "EVMOS",
    cmcId: null,
    categories: ["EVM", "Cosmos"],
    chainId: "9001",
    governanceID: ["snapshot:evmosdao.eth"],
    twitter: "EvmosOrg",
    url: "https://evmos.org/"
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
    twitter: "kadena_io",
    url: "https://www.kadena.io/"
  },
  "Vite": {
    geckoId: "vite",
    github: ['vitelabs'],
    symbol: "VITE",
    cmcId: "2937",
    twitter: "vitelabs",
    url: "https://vite.org/"
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
    twitter: "Milkomeda_com",
    url: "https://www.milkomeda.com/"
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
    twitter: "dfkchain",
    url: "https://defikingdoms.com/"
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
    twitter: "clv_org",
    url: "https://clv.org/"
  },
  "REI": {
    geckoId: "rei-network",
    github: ['REI-Network'],
    symbol: "REI",
    cmcId: "19819",
    categories: ["EVM"],
    chainId: 47805,
    governanceID: ["snapshot:rei-network.eth"],
    twitter: "GXChainGlobal",
    url: "https://www.rei.network/"
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
    twitter: "hedera",
    url: "https://hedera.com/"
  },
  "Findora": {
    geckoId: "findora",
    github: ['FindoraNetwork'],
    symbol: "FRA",
    cmcId: "4249",
    categories: ["EVM"],
    chainId: 2152,
    twitter: "Findora",
    url: "https://findora.org/"
  },
  "Hydra": {
    geckoId: "hydra",
    symbol: "HYDRA",
    cmcId: "8245",
    github: ["Hydra-Chain"],
  },
  "Bitgert": {
    geckoId: "bitrise-token",
    symbol: "BRISE",
    cmcId: "11079",
    categories: ["EVM"],
    chainId: 32520,
    twitter: "bitgertbrise",
    url: "https://bitgert.com/"
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
    twitter: "Reef_Chain",
    url: "https://reef.io/"
  },
  "Candle": {
    geckoId: "candle",
    symbol: "CNDL",
    cmcId: "18327",
    categories: ["EVM"],
    chainId: 534,
    governanceID: ["snapshot:cndl.eth"],
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
    twitter: "BifrostFinance",
    url: "https://bifrost.finance/"
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
    twitter: "StaFi_Protocol",
    url: "https://www.stafi.io/"
  },
  "Lachain": {
    geckoId: "latoken",
    github: ['LATOKEN'],
    symbol: "LA",
    cmcId: "2090",
    categories: ["EVM"],
    chainId: 225,
    twitter: "0xLachain",
    url: "https://lachain.io/"
  },
  "Coti": {
    geckoId: "coti",
    github: ['coti-io'],
    symbol: "COTI",
    cmcId: "3992",
    twitter: "COTInetwork",
    url: "https://coti.io/"
  },
  "Bitcoincash": {
    geckoId: "bitcoin-cash",
    symbol: "BCH",
    cmcId: "1831",
    url: "https://bch.info/en/"
  },
  "Litecoin": {
    geckoId: "litecoin",
    github: ['litecoin-project'],
    symbol: "LTC",
    cmcId: "2",
    twitter: "litecoin",
    url: "https://litecoin.org/"
  },
  "Doge": {
    geckoId: "dogecoin",
    github: ['dogecoin'],
    symbol: "DOGE",
    cmcId: "74",
    twitter: "dogecoin",
    url: "https://dogecoin.com/"
  },
  "Obyte": {
    geckoId: "byteball",
    github: ['byteball'],
    symbol: "GBYTE",
    cmcId: "1492",
    twitter: "ObyteOrg",
    url: "https://obyte.org/",
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
    twitter: "OntologyNetwork",
    url: "https://ont.io/"
  },
  "Carbon": {
    geckoId: "switcheo",
    github: ['Switcheo'],
    symbol: "SWTH",
    cmcId: "2620",
    categories: ["Cosmos"],
    twitter: "0xcarbon",
    url: "https://carbon.network/",
  },
  "Neo3": {
    geckoId: null,
    github: ['neo-project'],
    symbol: null,
    cmcId: null,
    twitter: "Neo_Blockchain",
    url: "https://neo.org/"
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
    twitter: "terra_money",
    url: "https://www.terra.money/"
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
    twitter: "SX_Network",
    url: "https://www.sx.technology/",
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
    twitter: "LBRYcom",
    url: "https://lbry.com/",
  },
  "Ravencoin": {
    geckoId: "ravencoin",
    github: ['RavenProject'],
    symbol: "RVN",
    cmcId: "2577",
    twitter: "Ravencoin",
    url: "https://ravencoin.org/",
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
    twitter: "AcalaNetwork",
    url: "https://acala.network/",
  },
  "ICP": {
    geckoId: "internet-computer",
    github: ['dfinity'],
    symbol: "ICP",
    cmcId: "8916",
    governanceID: ["icp"],
    twitter: "dfinity",
    url: "https://internetcomputer.org/",
  },
  "Nova Network": {
    geckoId: "supernova",
    github: ['nova-network-inc'],
    symbol: "SNT",
    cmcId: "15399",
    categories: ["EVM"],
    chainId: 87,
    governanceID: ["snapshot:novanetwork.eth"],
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
    twitter: "kintsugi_btc",
    url: "https://www.interlay.io/",
  },
  "Filecoin": {
    geckoId: "filecoin",
    github: ['filecoin-project'],
    symbol: "FIL",
    cmcId: "2280",
    categories: ["EVM"],
    twitter: "Filecoin",
    url: "https://filecoin.io/",
  },
  "Flow": {
    geckoId: "flow",
    github: ['onflow'],
    symbol: "FLOW",
    cmcId: "4558",
    twitter: "flow_blockchain",
    url: "https://flow.com/",
  },
  "Kujira": {
    geckoId: "kujira",
    github: ['Team-Kujira'],
    symbol: "KUJI",
    cmcId: "15185",
    categories: ["Cosmos"],
    twitter: "TeamKujira",
    url: "https://kujira.network/",
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
    },
    twitter: "ParallelFi",
    url: "https://parallel.fi/"
  },
  "Dogechain": {
    geckoId: "dogechain",
    github: ['dogechain-lab'],
    symbol: "DG",
    cmcId: null,
    categories: ["EVM"],
    twitter: "DogechainFamily",
    url: "https://dogechain.dog/",
  },
  "Canto": {
    geckoId: "canto",
    github: ['Canto-Network'],
    symbol: "CANTO",
    cmcId: "21516",
    categories: ["EVM", "Cosmos"],
    twitter: "CantoPublic",
    url: "https://canto.io/",
  },
  "XRPL": {
    geckoId: "ripple",
    github: ['XRPLF'],
    symbol: "XRP",
    cmcId: "52",
    twitter: "RippleXDev",
    url: "https://xrpl.org/",
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
    twitter: "GodwokenRises",
    url: "https://godwoken.com/"
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
    twitter: "arbitrum",
    url: "https://arbitrum.io/"
  },
  "Ultron": {
    geckoId: "ultron",
    github: ['UltronFoundationDev'],
    symbol: "ULX",
    cmcId: "21524",
    categories: ["EVM"],
    chainId: 1231,
    twitter: "ultron_found",
    url: "https://ultron.foundation/",
  },
  "Interlay": {
    geckoId: "interlay",
    github: ['interlay'],
    symbol: "INTR",
    cmcId: "20366",
    categories: ["Parachain", "Bitcoin Sidechains"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
    twitter: "InterlayHQ",
    url: "https://www.interlay.io/",
  },
  "Juno": {
    geckoId: "juno-network",
    github: ['CosmosContracts'],
    symbol: "JUNO",
    cmcId: "14299",
    categories: ["Cosmos"],
    twitter: "JunoNetwork",
    url: "https://junonetwork.io/",
  },
  "Tombchain": {
    geckoId: "tomb",
    github: ['tombchain'],
    symbol: "TOMB",
    cmcId: "11495",
    categories: ["EVM"],
    twitter: "TombChain",
  },
  "Crescent": {
    geckoId: "crescent-network",
    github: ['crescent-network'],
    symbol: "CRE",
    cmcId: null,
    categories: ["Cosmos"],
    twitter: "CrescentHub",
    url: "https://crescent.network/ "
  },
  "Vision": {
    geckoId: "vision-metaverse",
    github: ['vision-consensus'],
    symbol: "VS",
    cmcId: "19083",
    categories: ["EVM"],
    governanceID: ["snapshot:vnetwork.eth"],
    twitter: "Vision_Chain",
    url: "https://v.network/",
  },
  "EthereumPoW": {
    geckoId: "ethereum-pow-iou",
    github: ['ethereumpoworg'],
    symbol: "ETHW",
    cmcId: "21296",
    categories: ["EVM"],
    twitter: "EthereumPoW",
    url: "https://ethereumpow.org/",
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
    twitter: "functionx_io",
    url: "https://functionx.io/home",
  },
  "Aptos": {
    geckoId: "aptos",
    github: ['aptos-labs'],
    symbol: "APT",
    cmcId: "21794",
    twitter: "Aptos_Network",
    url: "https://aptosfoundation.org/",
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
    twitter: "Milkomeda_com",
    url: "https://www.milkomeda.com/"
  },
  "Stride": {
    geckoId: "stride",
    github: ['Stride-Labs'],
    symbol: "STRD",
    cmcId: "21781",
    categories: ["Cosmos"],
    twitter: "stride_zone",
    url: "https://www.stride.zone/",
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
    twitter: "Injective_",
    url: "https://injective.com/",
  },
  "Step": {
    geckoId: "stepex",
    symbol: "SPEX",
    cmcId: "21725",
    categories: ["EVM"],
    twitter: "StepApp_",
  },
  "TON": {
    geckoId: "the-open-network",
    github: ['ton-blockchain'],
    symbol: "TON",
    cmcId: "11419",
    twitter: "ton_blockchain",
    url: "https://ton.org/",
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
    governanceID: ["snapshot:starknet.eth"],
    twitter: "Starknet",
    url: "https://www.starknet.io/en",
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
    twitter: "ComdexOfficial",
    url: "https://comdex.one/",
  },
  "Flare": {
    geckoId: "flare-networks",
    github: ['flare-foundation'],
    symbol: "FLR",
    cmcId: "4172",
    categories: ["EVM"],
    twitter: "FlareNetworks",
    url: "https://flare.network/"
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
    github: ["OMAX-Development"]
  },
  "Bitindi": {
    geckoId: "bitindi-chain",
    github: ['bitindi'],
    symbol: "BNI",
    cmcId: "22026",
    categories: ["EVM"],
  },
  "MAP Protocol": {
    geckoId: "marcopolo",
    symbol: "MAP",
    cmcId: "4956",
    categories: ["EVM", "Bitcoin Sidechains"],
    twitter: "MapProtocol",
    url: "https://www.mapprotocol.io/",
  },
  "Stargaze": {
    geckoId: "stargaze",
    github: ['public-awesome'],
    symbol: "STARS",
    cmcId: "16842",
    categories: ["Cosmos"],
    twitter: "StargazeZone",
    url: "https://www.stargaze.zone/",
  },
  "Libre": {
    geckoId: "libre",
    symbol: "LIBRE",
    categories: ["Bitcoin Sidechains"],
    cmcId: null,
  },
  "UX": {
    geckoId: "umee",
    github: ['umee-network'],
    symbol: "UX",
    cmcId: "16389",
    categories: ["Cosmos"],
  },
  "WEMIX3.0": {
    geckoId: "wemix-token",
    github: ['wemixarchive'],
    symbol: "WEMIX",
    cmcId: "7548",
    categories: ["EVM"],
    twitter: "WemixNetwork",
    url: "https://www.wemix.com/",
  },
  "Persistence One": {
    geckoId: "persistence",
    github: ['persistenceOne'],
    symbol: "XPRT",
    cmcId: "7281",
    categories: ["Cosmos"],
    twitter: "PersistenceOne",
    url: "https://persistence.one/",
  },
  "ENULS": {
    geckoId: null,
    github: ['nuls-io'],
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    twitter: "Nuls",
    url: "https://nuls.io/"
  },
  "Oraichain": {
    geckoId: "oraichain-token",
    github: ['oraichain'],
    symbol: "ORAI",
    cmcId: "7533",
    categories: ["Cosmos"],
    twitter: "oraichain",
    url: "https://orai.io/",
  },
  "Goerli": {
    geckoId: "goerli-eth",
    symbol: "GETH",
    cmcId: "23669",
    categories: ["EVM"],
  },
  "SKALE Europa": {
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
    categories: ["EVM", "Bitcoin Sidechains"],
    twitter: "Coredao_Org",
    url: "https://coredao.org/",
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
  "ZKsync Era": {
    geckoId: "zksync",
    github: ['matter-labs'],
    symbol: "ZK",
    cmcId: "24091",
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 324,
    twitter: "zksync",
    url: "https://zksync.io/",
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
    chainId: 1101,
    twitter: "0xPolygon",
    url: "https://polygon.technology/"
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
    twitter: "EquilibriumDeFi",
    url: "https://eq.finance/"
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
    twitter: "EOSNetworkFDN",
    url: "https://eosnetwork.com/"
  },
  "Quicksilver": {
    geckoId: "quicksilver",
    github: ['ingenuity-build'],
    symbol: "QCK",
    cmcId: null,
    categories: ["Cosmos"],
    twitter: "quicksilverzone",
    url: "https://quicksilver.zone/"
  },
  "Oasys": {
    geckoId: "oasys",
    github: ['oasysgames'],
    symbol: "OAS",
    cmcId: "22265",
    categories: ["EVM"],
    twitter: "oasys_games",
    url: "https://www.oasys.games/",
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
    twitter: "SuiNetwork",
    url: "https://sui.io/",
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
    chainid: 369,
    twitter: "PulsechainCom",
    url: "https://pulsechain.com/",
  },
  "XPLA": {
    geckoId: "xpla",
    symbol: "XPLA",
    cmcId: "22359",
    github: ["xpladev"],
    categories: ["Cosmos"],
    twitter: "XPLA_Official",
    url: "https://www.xpla.io/"
  },
  "Neutron": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["Cosmos"],
    twitter: "Neutron_org",
    url: "https://www.neutron.org/",
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
    github: ["pokt-network"],
    twitter: "POKTnetwork",
    url: "https://www.pokt.network/",
  },
  "Quasar": {
    geckoId: null,
    symbol: "QSR",
    cmcId: null,
    github: ["quasar-finance"],
    categories: ["Cosmos"],
    twitter: "QuasarFi",
    url: "https://quasar.fi/",
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
    twitter: "ChihuahuaChain",
    url: "https://www.chihuahua.wtf/",
  },
  "Rollux": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    github: ["SYS-Labs"],
    categories: ["EVM", "Rollup", "Bitcoin Sidechains"],
    chainid: 570,
    parent: {
      chain: "Syscoin",
      types: ["L2", "gas"]
    },
    twitter: "RolluxL2",
    url: "https://rollux.com/",
  },
  "Tenet": {
    geckoId: "tenet-1b000f7b-59cb-4e06-89ce-d62b32d362b9",
    symbol: "TENET",
    cmcId: "24892",
    github: ["tenet-org"],
    categories: ["EVM"],
    twitter: "tenet_org",
    url: "https://tenet.org/",
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
    twitter: "0xMantle",
    url: "https://www.mantle.xyz/",
  },
  "Neon": {
    geckoId: "neon",
    symbol: "NEON",
    cmcId: "26735",
    github: ["neonevm"],
    categories: ["EVM"],
    chainId: 245022934,
    twitter: "Neon_EVM",
    url: "https://neonevm.org/",
  },
  "Base": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    github: ["base-org"],
    categories: ["EVM", "Rollup", "Superchain"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 8453,
    twitter: "base",
    url: "https://www.base.org/",
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
    twitter: "LineaBuild",
    url: "https://linea.build/",
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
    github: ["aura-nw"],
    twitter: "AuraNetworkHQ",
    url: "https://aura.network/",
  },
  "Sei": {
    geckoId: "sei-network",
    symbol: "SEI",
    cmcId: "23149",
    categories: ["Cosmos"],
    github: ["sei-protocol"],
    twitter: "SeiNetwork",
    url: "https://www.sei.io/",
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
  "Hydration": {
    geckoId: "hydradx",
    github: ['galacticcouncil'],
    symbol: "HDX",
    cmcId: "6753",
    categories: ["Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
    twitter: "hydration_net",
    url: "https://hydration.net/",
  },
  "Shibarium": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    twitter: "ShibariumNet",
    url: "https://shibatoken.com/",
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
    categories: ["EVM","Rollup", "Superchain"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 255,
    github: ["kroma-network"],
  },
  "Manta": {
    geckoId: "manta-network",
    symbol: "MANTA",
    cmcId: "13631",
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    github: ['manta-network'],
    chainId: 169, //being used as id for volume/fees
    twitter: "MantaNetwork",
    url: "https://manta.network/",
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
    twitter: "shimmernet",
    url: "https://shimmer.network/",
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
    twitter: "MeritCircle_IO",
    url: "https://meritcircle.io/",
  },
  "NOS": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Bitcoin Sidechains"],
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
    twitter: "Scroll_ZKP",
    url: "https://scroll.io/",
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
    github: ["bifrost-platform"],
    twitter: "Bifrost_Network",
    url: "https://www.bifrostnetwork.com/",
  },
  "Radix": {
    geckoId: "radix",
    symbol: "XRD",
    cmcId: "11948",
    github: ["radixdlt"],
    twitter: "radixdlt",
    url: "https://www.radixdlt.com/",
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
    twitter: "horizenglobal",
    url: "https://www.horizen.io/",
  },
  "Chiliz": {
    geckoId: "chiliz",
    symbol: "CHZ",
    cmcId: "4066",
    categories: ["EVM"],
    chainId: 88888,
    twitter: "Chiliz",
    url: "https://www.chiliz.com/",
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
  },
  "PGN": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
  },
  "Mayachain": {
    geckoId: "cacao",
    symbol: "CACAO",
    cmcId: null,
    twitter: "Maya_Protocol",
    url: "https://www.mayaprotocol.com/",
  },
  "Dash": {
    geckoId: "dash",
    symbol: "DASH",
    cmcId: "131",
    twitter: "dashpay",
    url: "https://www.dash.org/",
  },
  "Bostrom": {
    geckoId: "bostrom",
    symbol: "BOOT",
    cmcId: "19111",
    categories: ["Cosmos"],
    github: ["cybercongress"]
  },
  "Alephium": {
    geckoId: "alephium",
    symbol: "ALPH",
    cmcId: "14878",
    github: ["alephium"]
  },
  "Mode": {
    geckoId: "mode",
    symbol: "MODE",
    cmcId: null,
    categories: ["EVM", "Rollup", "Superchain"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    github: ["mode-network"],
    chainId: 34443,
    twitter: "modenetwork",
    url: "https://www.mode.network/",
  },
  "FSC": {
    geckoId: "fonsmartchain",
    symbol: "FON",
    cmcId: "22607",
    github: ["FONSmartChain"],
    categories: ["EVM"],
    twitter: "FONSmartChain",
    url: "https://fonchain.io/",
  },
  "Newton": {
    geckoId: "newton-project",
    symbol: "NEW",
    cmcId: "3871",
    github: ["newtonproject"],
    categories: ["EVM"],
  },
  "JBC": {
    geckoId: null,
    symbol: "JBC",
    cmcId: null,
    github: null,
    categories: ["EVM"],
    twitter: "jibchain",
    url: "https://jibchain.net/",
  },
  "Sommelier": {
    geckoId: "sommelier",
    symbol: "SOMM",
    cmcId: "18248",
    categories: ["Cosmos"],
    twitter: "sommfinance",
    url: "https://www.sommelier.finance/",
  },
  "Bahamut": {
    geckoId: "fasttoken",
    symbol: "FTN",
    cmcId: "22615",
    categories: ["EVM"],
    github: ["fastexlabs"]
  },
  "Zkfair": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2"]
    },
    twitter: "ZKFCommunity",
    url: "https://zkfair.io/",
    chainId: 42766
  },
  "CMP": {
    geckoId: "caduceus",
    symbol: "CMP",
    cmcId: "20056",
    categories: ["EVM"],
    chainId: 256256
  },
  "Firechain": {
    geckoId: null,
    symbol: "FIRE",
    cmcId: null,
    categories: ["EVM"],
    chainId: 529
  },
  "BEVM": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Bitcoin Sidechains"],
    github: ["btclayer2"]
  },
  "AirDAO": {
    geckoId: "amber",
    symbol: "AMB",
    cmcId: "2081",
    categories: ["EVM"],
    github: ["ambrosus"],
    governanceID: ["snapshot:airdaofoundation.eth"],
    url: "https://airdao.io/",
    chainId: 16718
  },
  "dYdX": {
    geckoId: "dydx-chain",
    symbol: "dYdX",
    cmcId: "28324",
    categories: ["Cosmos"],
    github: ["dydxfoundation", "dydxprotocol"],
    twitter: "dYdX",
    url: "https://dydx.exchange/",
  },
  "Bitnet": {
    geckoId: "bitnet",
    symbol: "BTN",
    cmcId: null,
    categories: ["EVM"],
    github: ["BitnetMoney"],
    twitter: "BitnetMoney",
    url: "https://bitnet.money/",
  },
  "ZetaChain": {
    geckoId: "zetachain",
    symbol: "ZETA",
    cmcId: "21259",
    categories: ["EVM"],
    github: ["zeta-chain"],
    twitter: "zetablockchain",
    url: "https://www.zetachain.com",
  },
  "Celestia": {
    geckoId: "celestia",
    symbol: "TIA",
    cmcId: "22861",
    categories: ["Cosmos"],
    github: ["celestiaorg"],
    twitter: "CelestiaOrg",
    url: "https://celestia.org",
  },
  "Fraxtal": {
    geckoId: "fraxtal",
    symbol: "FXTL",
    cmcId: null,
    categories: ["EVM","Superchain"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 252,
    twitter: "fraxfinance",
    url: "https://frax.finance",
  },
  "Areon Network": {
    geckoId: "areon-network",
    symbol: "AREA",
    cmcId: "23262",
    categories: ["EVM"],
    twitter: "AreonNetwork",
    github: ["areon-network"],
    url: "https://areon.network",
  },
  "DeFiVerse": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    twitter: "DeFiVerse_org",
    url: "https://defi-verse.org",
  },
  "Manta Atlantic": {
    geckoId: null,
    symbol: "MANTA",
    cmcId: null,
    categories: ["Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
    twitter: "MantaNetwork",
    url: "https://atlantic.manta.network"
  },
  "Xai": {
    geckoId: "xai-blockchain",
    symbol: "XAI",
    cmcId: "28374",
    categories: ["EVM", "Arbitrum Orbit"],
    parent: {
      chain: "Arbitrum",
      types: ["L3"]
    },
    twitter: "XAI_GAMES",
    url: "https://xai.games"
  },
  "Merlin": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Bitcoin Sidechains"],
    twitter: "MerlinLayer2",
    url: "https://merlinchain.io",
  },
  "Blast": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 81457,
    twitter: "Blast_L2",
    url: "https://blast.io",
  },
  "Bitrock": {
    geckoId: "bitrock",
    symbol: "BROCK",
    cmcId: "27606",
    categories: ["EVM"],
    twitter: "BitRockChain",
    url: "https://www.bit-rock.io",
    github: ["BitrockChain"],
    chainId: 7171
  },
  "Astar zkEVM": {
    geckoId: null,
    github: ['AstarNetwork'],
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 3776,
    twitter: "AstarNetwork",
    url: "https://astar.network/"
  },
  "Naka": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Bitcoin Sidechains"],
    twitter: "naka_chain",
    url: "https://nakachain.xyz/",
  },
  "inEVM": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    parent: {
      chain: "Injective",
      types: ["gas"]
    },
    chainId: 2525,
    twitter: "injective",
    url: "https://inevm.com/"
  },
  "Oasis Sapphire": {
    geckoId: null,
    symbol: "ROSE",
    cmcId: null,
    categories: ["EVM"],
    parent: {
      chain: "Oasis",
      types: ["gas"]
    },
    chainId: 23294,
    twitter: "OasisProtocol",
    url: "https://oasisprotocol.org/sapphire"
  },
  "Dymension": {
    geckoId: "dymension",
    symbol: "DYM",
    cmcId: "28932",
    github: ["dymensionxyz"],
    categories: ["Cosmos"],
    twitter: "dymension",
    url: "https://portal.dymension.xyz/"
  },
  "Q Protocol": {
    geckoId: null,
    symbol: "QGOV",
    cmcId: null,
    categories: ["EVM"],
    twitter: "QBlockchain",
    url: "https://q.org/",
    chainId: 35441
  },
  "zkLink Nova": {
    geckoId: "zklink",
    symbol: "ZKL",
    cmcId: null,
    categories: ["EVM"],
    twitter: "zkLink_Official",
    url: "https://zk.link",
    github: ["zkLinkProtocol"],
    chainId: 810180
  },
  "Kinto": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 7887,
    twitter: "KintoXYZ",
    github: ["KintoXYZ"],
    url: "https://www.kinto.xyz/"
  },
  "Immutable zkEVM": {
    geckoId: "immutable-x",
    symbol: "IMX",
    cmcId: "10603",
    categories: ["EVM"],
    twitter: "Immutable",
    url: "https://www.immutable.com",
    chainId: 13371
  },
  "Zora": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup", "Superchain"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    chainId: 7777777,
    twitter: "zora",
    url: "https://zora.co"
  },
  "DeFiChain EVM": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    chainId: 1130,
    twitter: "defichain",
    url: "https://defichain.com/"
  },
  "RSS3": {
    geckoId: "rss3",
    symbol: "RSS3",
    cmcId: null,
    categories: ["EVM"],
    twitter: "rss3_",
    url: "https://rss3.io/"
  },
  "Bittensor": {
    geckoId: "bittensor",
    symbol: "TAO",
    cmcId: "22974",
    twitter: "opentensor",
    url: "https://bittensor.com/"
  },
  "Degen": {
    geckoId: "degen-base",
    symbol: "DEGEN",
    cmcId: null,
    categories: ["EVM"],
    parent: {
      chain: "Base",
      types: ["L3"]
    },
    chainId: 666666666,
    twitter: "degentokenbase",
    url: "https://www.degen.tips"
  },
  "HAQQ": {
    geckoId: "islamic-coin",
    symbol: "ISLM",
    cmcId: "26220",
    categories: ["EVM", "Cosmos"],
    twitter: "The_HaqqNetwork",
    url: "https://haqq.network/",
    github: ["haqq-network"],
    chainId: "11235"
  },
  "SatoshiVM": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Bitcoin Sidechains"],
    twitter: "satoshivm",
    url: "https://www.satoshivm.io/",
    github: ["SatoshiVM"],
    chainId: "3109"
  },
  "Venom": {
    geckoId: "venom",
    symbol: "VENOM",
    cmcId: "22059",
    twitter: "VenomFoundation",
    url: "https://venom.foundation/",
    github: ["venom-blockchain"],
  },
  "K2": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    twitter: "Karak_Network",
    url: "https://karak.network/",
    chainId: "2410"
  },
  "Bitkub Chain": {
    geckoId: "bitkub-coin",
    symbol: "KUB",
    cmcId: "16093",
    categories: ["EVM"],
    twitter: "bitkubchain",
    url: "https://www.bitkubchain.com",
    github: ["bitkub-chain"],
    chainId: 96
  },
  "Ancient8": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    parent: {
      chain: "Optimism",
      types: ["L3"]
    },
    chainId: 888888888,
    twitter: "Ancient8_gg",
    url: "https://ancient8.gg/"
  },
  "Hyperliquid": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["Cosmos"],
    twitter: "HyperliquidX",
    url: "https://hyperliquid.xyz/"
  },
  "Nibiru": {
    geckoId: "nibiru",
    symbol: "NIBI",
    cmcId: "28508",
    twitter: "NibiruChain",
    url: "https://nibiru.fi",
  },
  "BSquared": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Bitcoin Sidechains"],
    twitter: "BSquaredNetwork",
    url: "https://www.bsquared.network/"
  },
  "Lyra Chain": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    twitter: "lyrafinance",
    url: "https://lyra.finance",
    chainId: 957,
  },
  "Planq": {
    geckoId: "planq",
    symbol: "PLQ",
    cmcId: "28804",
    categories: ["EVM"],
    twitter: "PlanqFoundation",
    url: "https://planq.network",
    github: ["planq-network"],
    chainId: 7070,
  },
  "X Layer": {
    geckoId: "x-layer",
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    parent: {
      chain: "OKTChain",
      types: ["L2","gas"]
    },
    twitter: "okx",
    url: "https://www.okx.com/xlayer"
  },
  "LaChain Network": {
    geckoId: "la-coin",
    symbol: "LAC",
    cmcId: null,
    categories: ["EVM"],
    chainId: 274,
    twitter: "LaChain_Network",
    url: "https://www.lachain.network"
  },
  "BOB": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Rollup", "Bitcoin Sidechains"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    github: ["bob-collective"],
    chainId: 60808,
    twitter: "build_on_bob",
    url: "https://www.gobob.xyz",
  },
  "Bitlayer": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    twitter: "BitlayerLabs",
    categories: ["Bitcoin Sidechains","EVM"],
    github: ["bitlayer-org"],
    chainId: 200901,
    url: "https://www.bitlayer.org"
  },
  "Endurance": {
    geckoId: "endurance",
    symbol: "ACE",
    cmcId: "28674",
    categories: ["EVM"],
    twitter: "fusionistio",
    chainId: 648,
    url: "https://ace.fusionist.io/"
  },
  "DFS Network": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    twitter: "dfsdeveloper",
    url: "https://twitter.com/dfsdeveloper"
  },
  "Cyber": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM","Rollup", "Superchain"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    twitter: "BuildOnCyber",
    url: "https://cyber.co/",
    github: ["cyberconnecthq"],
    chainId: 7560,
  },
  "BounceBit": {
    geckoId: "bouncebit",
    symbol: "BB",
    cmcId: "30746",
    categories: ["EVM", "Bitcoin Sidechains"],
    twitter: "bounce_bit",
    url: "https://bouncebit.io/",
    chainId: 6001,
  },
  "re.al": {
    geckoId: "re-al",
    symbol: "RWA",
    cmcId: null,
    categories: ["EVM"],
    twitter: "real_rwa",
    url: "https://www.re.al",
    github: ["re-al-Foundation"],
    chainId: 111188
  },
  "Taiko": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM","Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2"]
    },
    twitter: "taikoxyz",
    url: "https://taiko.xyz",
    chainId: 167000
  },
  "Genesys": {
    geckoId: "genesys",
    symbol: "GSYS",
    cmcId: "27940",
    categories: ["EVM"],
    twitter: "GenesysChain",
    url: "https://genesys.network/",
    github: ["GENESYSBLOCKCHAIN"],
    chainId: 16507
  },
  "Polkadex": {
    geckoId: "polkadex",
    github: ['Polkadex-Substrate'],
    symbol: "PDEX",
    cmcId: "9017",
    categories: ["Parachain"],
    parent: {
      chain: "Polkadot",
      types: ["parachain"]
    },
  },
  "aelf": {
    geckoId: "aelf",
    symbol: "ELF",
    cmcId: "2299",
    twitter: "aelfblockchain",
    url: "https://aelf.com/",
    github: ["aelfProject"],
  },
  "Lukso": {
    geckoId: "lukso-token-2",
    symbol: "LYX",
    cmcId: "27622",
    categories: ["EVM"],
    twitter: "lukso_io",
    url: "https://www.lukso.network",
    github: ["lukso-network"],
    chainId: 42
  },
  "Joltify": {
    geckoId: "joltify",
    symbol: "JOLT",
    cmcId: "19855",
    categories: ["EVM","Cosmos"],
    twitter: "joltify_finance",
    url: "https://joltify.io/",
    github: ["joltify-finance"]
  },
  "IOTA EVM": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM","Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2"]
    },
    twitter: "iota",
    url: "https://blog.iota.org/iotas-evm-mainnet-launch/",
    chainId: 8822
  },
  "Ham": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Superchain"],
    parent: {
      chain: "Base",
      types: ["L3"]
    },
    twitter: "HamOnWarpcast",
    url: "https://ham.fun",
    chainId: 5112,
  },
  "Sanko": {
    geckoId: "dream-machine-token",
    symbol: "DMT",
    cmcId: "25653",
    categories: ["EVM", "Arbitrum Orbit"],
    parent: {
      chain: "Arbitrum",
      types: ["L3"]
    },
    twitter: "SankoGameCorp",
    url: "https://sanko.xyz/",
    chainId: 1996,
  },
  "Rari": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Arbitrum Orbit"],
    parent: {
      chain: "Arbitrum",
      types: ["L3"]
    },
    twitter: "RariChain",
    url: "https://rarichain.org/",
    chainId: 1380012617,
  },
  "Massa": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["Cosmos"],
    twitter: "massalabs",
    url: "https://massa.net",
  },
  "AILayer": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM", "Bitcoin Sidechains"],
    twitter: "AILayerXYZ",
    url: "https://anvm.io/",
    chainId: 2649
  },
  "Mint": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM","Rollup", "Superchain"],
    parent: {
      chain: "Ethereum",
      types: ["L2"]
    },
    twitter: "Mint_Blockchain",
    url: "https://www.mintchain.io/",
    chainId: 185
  },
  "OXFUN": {
    geckoId: "ox-fun",
    symbol: "OX",
    cmcId: "29530",
    categories: ["EVM"],
    parent: {
      chain: "Base",
      types: ["L3"]
    },
    twitter: "OXFUNHQ",
    url: "https://ox.fun/en",
    chainId: 6699
  },
  "Etherlink": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    twitter: "etherlink",
    url: "https://www.etherlink.com",
    chainId: 42793
  },
  "Noble": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    github: ["noble-assets"],
    categories: ["Cosmos"],
    twitter: "noble_xyz",
    url: "https://x.com/noble_xyz"
  },
  "Aeternity": {
    geckoId: "aeternity",
    symbol: "AE",
    cmcId: "1700",
    twitter: "aeternity",
    url: "https://aeternity.com/",
  },
  "Saakuru": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    twitter: "saakuru_labs",
    url: "https://saakuru.com/",
    chainId: 7225878,
    parent: {
      chain: "Oasys",
      types: ["L2"]
    },
  },
  "Reya Network": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM"],
    parent: {
      chain: "Ethereum",
      types: ["L2", "gas"]
    },
    url: "https://reya.network",
    chainId: 1729
  },
  "Cronos zkEVM": {
    geckoId: null,
    symbol: null,
    cmcId: null,
    categories: ["EVM","Rollup"],
    parent: {
      chain: "Ethereum",
      types: ["L2"]
    },
    url: "https://cronos.org/zkevm",
    twitter: "cronos_chain",
    chainId: 388
  },
  "Dexalot": {
    geckoId: "dexalot",
    symbol: "ALOT",
    cmcId: "18732",
    categories: ["EVM"],
    parent: {
      chain: "Avalanche",
      types: ["subnet"]
    },
    chainId: 432204,
    twitter: "dexalot",
    github: ["dexalot"],
    url: "https://dexalot.com"
  },
} as unknown as ChainCoinGekcoIds

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
chainCoingeckoIds["Map"] = chainCoingeckoIds["MAP Protocol"]
chainCoingeckoIds["Pulse"] = chainCoingeckoIds["PulseChain"]
chainCoingeckoIds["WEMIX"] = chainCoingeckoIds["WEMIX3.0"]
chainCoingeckoIds["Umee"] = chainCoingeckoIds["UX"]
chainCoingeckoIds["TomoChain"] = chainCoingeckoIds["Viction"]
chainCoingeckoIds["zkLink"] = chainCoingeckoIds["zkLink Nova"]
chainCoingeckoIds["Europa"] = chainCoingeckoIds["SKALE Europa"]
chainCoingeckoIds["HydraDX"] = chainCoingeckoIds["Hydration"]
chainCoingeckoIds["Ripple"] = chainCoingeckoIds["XRPL"]
chainCoingeckoIds["Persistence"] = chainCoingeckoIds["Persistence One"]
chainCoingeckoIds["Klaytn"] = chainCoingeckoIds["Kaia"]

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
      return "ZKsync Lite"
    case "polygon_zkevm":
      return "Polygon zkEVM"
    case "eos_evm":
      return "EOS EVM"
    case "Map":
      return "MAP Protocol"
    case "Pulse":
      return "PulseChain"
    case "Op_Bnb":
        return "opBNB"
    case "WEMIX":
      return "WEMIX3.0"
    case "Umee":
      return "UX"
    case "TomoChain":
      return "Viction"
    case "Sapphire":
      return "Oasis Sapphire"
    case "Oasis":
      return "Oasis Emerald"
    case "zklink":
      return "zkLink Nova"
    case "Bitkub":
      return "Bitkub Chain"
    case "HydraDX":
      return "Hydration"
    case "Ripple":
      return "XRPL"
    case "Persistence":
      return "Persistence One"
    case "Klaytn":
      return "Kaia"
    case "zkSync Era":
      return "ZKsync Era"
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
    case "sapphire":
      return useNewChainNames ? "Oasis Sapphire" : "Sapphire"
    case "oasis":
      return useNewChainNames ? "Oasis Emerald" : "Oasis"
    case "klaytn":
      return useNewChainNames ? "Kaia" : "Klaytn"
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
      return useNewChainNames ? "Viction" : "TomoChain"
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
      return useNewChainNames ? "ZKsync Lite" : "zkSync"
    case "zksync era":
      return useNewChainNames ? "ZKsync Era" : "zkSync Era"
    case "bifrost network":
      return "Bifrost Network"
    case "bevm":
      return "BEVM"
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
      return useNewChainNames ? "XRPL" : "Ripple"
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
      return useNewChainNames ? "MAP Protocol" : "Map"
    case "stargaze":
      return "Stargaze"
    case "libre":
      return "Libre"
    case "umee":
      return useNewChainNames ? "UX" : "Umee"
    case "wemix":
      return useNewChainNames ? "WEMIX3.0" : "WEMIX"
    case "persistence":
      return useNewChainNames ? "Persistence One" : "Persistence"
    case "enuls":
      return "ENULS"
    case "orai":
      return useNewChainNames ? "Oraichain" : "Orai"
    case "goerli":
      return "Goerli"
    case "europa":
      return "SKALE Europa"
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
      return "ZKsync Era"
    case "bfc":
      return "Bifrost Network"
    case "chainx":
      return "BEVM"
    case "ftn":
      return "Bahamut"
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
      return useNewChainNames ? "Hydration" : "HydraDX"
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
    case "pgn":
      return "PGN"
    case "mayachain":
      return "Mayachain"
    case "dash":
      return "Dash"
    case "bostrom":
      return "Bostrom"
    case "alephium":
      return "Alephium"
    case "mode":
      return "Mode"
    case "fsc":
      return "FSC"
    case "new":
      return "Newton"
    case "jbc":
      return "JBC"
    case "sommelier":
      return "Sommelier"
    case "bahamut":
      return "Bahamut"
    case "zkfair":
      return "Zkfair"
    case "cmp":
      return "CMP"
    case "firechain":
      return "Firechain"
    case "airdao":
      return "AirDAO"
    case "dydx":
      return "dYdX"
    case "btn":
      return "Bitnet"
    case "bitnet":
      return "Bitnet"
    case "zeta":
      return "ZetaChain"
    case "celestia":
      return "Celestia"
    case "fraxtal":
      return "Fraxtal"
    case "area":
      return "Areon Network"
    case "defiverse":
      return "DeFiVerse"
    case "manta_atlantic":
      return "Manta Atlantic"
    case "xai":
      return "Xai"
    case "merlin":
      return "Merlin"
    case "blast":
      return "Blast"
    case "bitrock":
      return "Bitrock"
    case "astrzk":
      return "Astar zkEVM"
    case "naka":
      return "Naka"
    case "inevm":
      return "inEVM"
    case "dymension":
      return "Dymension"
    case "q":
      return "Q Protocol"
      case "zklink":
        return useNewChainNames ? "zkLink Nova" : "zkLink"
    case "kinto":
      return "Kinto"
    case "imx":
      return "Immutable zkEVM"
    case "zora":
      return "Zora"
    case "defichain_evm":
      return "DeFiChain EVM"
    case "rss3_vsl":
      return "RSS3"
    case "bittensor":
      return "Bittensor"
    case "degen":
      return "Degen"
    case "islm":
      return "HAQQ"
    case "svm":
      return "SatoshiVM"
    case "venom":
      return "Venom"
    case "karak":
      return "K2"
    case "bitkub":
      return useNewChainNames ? "Bitkub Chain" : "Bitkub"
    case "ancient8":
      return "Ancient8"
    case "hyperliquid":
      return "Hyperliquid"
    case "nibiru":
      return "Nibiru"
    case "bsquared":
      return "BSquared"
    case "lyra":
      return "Lyra Chain"
    case "planq":
      return "Planq"
    case "xlayer":
      return "X Layer"
    case "lac":
      return "LaChain Network"
    case "bob":
      return "BOB"
    case "btr":
      return "Bitlayer"
    case "ace":
      return "Endurance"
    case "dfs":
      return "DFS Network"
    case "cyeth":
      return "Cyber"
    case "bouncebit":
        return "BounceBit"
    case "real":
        return "re.al"
    case "taiko":
        return "Taiko"
    case "genesys":
      return "Genesys"
    case "kava":
      return "Kava"
    case "polkadex":
      return "Polkadex"
    case "aelf":
      return "aelf"
    case "lukso":
      return "Lukso"
    case "joltify":
      return "Joltify"
    case "iotaevm":
      return "IOTA EVM"
    case "ham":
      return "Ham"
    case "sanko":
      return "Sanko"
    case "rari":
      return "Rari"
    case "massa":
      return "Massa"
    case "ailayer":
      return "AILayer"
    case "mint":
      return "Mint"
    case "ox_chain":
      return "OXFUN"
    case "etlk":
      return "Etherlink"
    case "noble":
      return "Noble"
    case "aeternity":
      return "Aeternity"
    case "saakuru":
      return "Saakuru"
    case "reya":
      return "Reya Network"
    case "cronos_zkevm":
      return "Cronos zkEVM"
    case "dexalot":
      return "Dexalot"
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