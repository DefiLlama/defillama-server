export default {
    "Ethereum": {
        geckoId: "ethereum",
        symbol: "ETH",
        cmcId: "1027",
        categories: ["EVM"],
        chainId: 1,
    },
    "Arbitrum": {
        geckoId: "arbitrum",
        symbol: "ARB",
        cmcId: "42161",
        categories: ["EVM", "Rollup"],
        parent: {
            chain: "Ethereum",
            types: ["L2", "gas"]
        },
        chainId: 42161,
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
    "BSC": {
        geckoId: "binancecoin",
        symbol: "BNB",
        cmcId: "1839",
        categories: ["EVM"],
        chainId: 56,
    },
    "Avalanche": {
        geckoId: "avalanche-2",
        symbol: "AVAX",
        cmcId: "5805",
        categories: ["EVM"],
        chainId: 43114,
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
        categories: ["EVM"],
        chainId: 137,
    },
    "Terra Classic": {
        geckoId: "terra-luna",
        symbol: "LUNC",
        cmcId: "4172",
        categories: ["Cosmos"],
    },
    "Fantom": {
        geckoId: "fantom",
        symbol: "FTM",
        cmcId: "3513",
        categories: ["EVM"],
        chainId: 250,
    },
    "Gnosis": {
        geckoId: "gnosis",
        symbol: "GNO",
        cmcId: "1659",
        categories: ["EVM"],
        chainId: 100,
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
        symbol: "KAVA",
        cmcId: "4846",
        categories: ["Cosmos"],
    },
    "OKXChain": {
        geckoId: "oec-token",
        symbol: "OKT",
        cmcId: "8267",
        categories: ["EVM", "Cosmos"],
        chainId: 66,
    },
    "Wanchain": {
        geckoId: "wanchain",
        symbol: "WAN",
        cmcId: "2606",
        categories: ["EVM"],
        chainId: 888,
    },
    "Posichain": {
        geckoId: "position-token",
        symbol: "POSI",
        cmcId: "11234",
        categories: ["EVM"],
        chainId: 900000,
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
        categories: ["EVM"],
        chainId: 39797,
    },
    "Secret": {
        geckoId: "secret",
        symbol: "SCRT",
        cmcId: "5604",
        categories: ["Cosmos"],
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
        categories: ["EVM"],
        chainId: 1666600000,
    },
    "Rootstock": {
        geckoId: "rootstock",
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
        symbol: "EROWAN",
        cmcId: "8541",
        categories: ["Cosmos"],
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
        categories: ["Cosmos"],
    },
    "Thorchain": {
        geckoId: "thorchain",
        symbol: "RUNE",
        cmcId: "4157",
        categories: ["Cosmos"],
    },
    "Tron": {
        geckoId: "tron",
        symbol: "TRON",
        cmcId: "1958",
        categories: ["EVM"],
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
        categories: ["EVM"],
        chainId: 42220,
    },
    "KCC": {
        geckoId: "kucoin-shares",
        symbol: "KCS",
        cmcId: "2087",
        categories: ["EVM"],
        chainId: 321,
    },
    "Karura": {
        geckoId: "karura",
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
        symbol: "WAVES",
        cmcId: "1274",
    },
    "Klaytn": {
        geckoId: "klay-token",
        symbol: "KLAY",
        cmcId: "4256",
        categories: ["EVM"],
        chainId: 8217,
    },
    "IoTeX": {
        geckoId: "iotex",
        symbol: "IOTX",
        cmcId: "2777",
        categories: ["EVM"],
        chainId: 4689,
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
        categories: ["EVM", "Parachain"],
        parent: {
            chain: "Kusama",
            types: ["parachain"]
        },
        chainId: 336,
    },
    "Telos": {
        geckoId: "telos",
        symbol: "TLOS",
        cmcId: "4660",
        categories: ["EVM"],
        chainId: 40,
    },
    "ThunderCore": {
        geckoId: "thunder-token",
        symbol: "TT",
        cmcId: "3930",
        categories: ["EVM"],
        chainId: 108,
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
        categories: ["EVM"],
        chainId: 19,
    },
    "EnergyWeb": {
        geckoId: "energy-web-token",
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
        symbol: "HPB",
        cmcId: "2345",
        categories: ["EVM"],
        chainId: 269,
    },
    "GoChain": {
        geckoId: "gochain",
        symbol: "GO",
        cmcId: "2861",
        categories: ["EVM"],
        chainId: 60,
    },
    "TomoChain": {
        geckoId: "tomochain",
        symbol: "TOMO",
        cmcId: "2570",
        categories: ["EVM"],
        chainId: 88,
    },
    "Fusion": {
        geckoId: "fsn",
        symbol: "FSN",
        cmcId: "2530",
        categories: ["EVM"],
        chainId: 32659,
    },
    "Kardia": {
        geckoId: "kardiachain",
        symbol: "KAI",
        cmcId: "5453",
        categories: ["EVM"],
        chainId: 0,
    },
    "Fuse": {
        geckoId: "fuse-network-token",
        symbol: "FUSE",
        cmcId: "5634",
        categories: ["EVM"],
        chainId: 122,
    },
    "smartBCH": {
        geckoId: "bitcoin-cash",
        symbol: "BCH",
        cmcId: "1831",
        categories: ["EVM"],
        chainId: 10000,
    },
    "Elastos": {
        geckoId: "elastos",
        symbol: "ELA",
        cmcId: "2492",
        categories: ["EVM"],
        chainId: 20,
    },
    "Hoo": {
        geckoId: "hoo-token",
        symbol: "HOO",
        cmcId: "7543",
        categories: ["EVM"],
        chainId: 70,
    },
    "Cronos": {
        geckoId: "crypto-com-chain",
        symbol: "CRO",
        cmcId: "3635",
        categories: ["EVM", "Cosmos"],
        chainId: 25,
    },
    "Polis": {
        geckoId: "polis",
        symbol: "POLIS",
        cmcId: "2359",
        categories: ["EVM"],
        chainId: 333999,
    },
    "ZYX": {
        geckoId: "zyx",
        symbol: "ZYX",
        cmcId: "6131",
        categories: ["EVM"],
        chainId: 55,
    },
    "MultiversX": {
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
        categories: ["EVM", "Rollup"],
        parent: {
            chain: "Ethereum",
            types: ["L2", "gas"]
        },
        chainId: 288,
    },
    "Metis": {
        geckoId: "metis-token",
        symbol: "METIS",
        cmcId: "9640",
        categories: ["EVM", "Rollup"],
        parent: {
            chain: "Ethereum",
            types: ["L2", "gas"]
        },
        chainId: 1088,
    },
    "Ubiq": {
        geckoId: "ubiq",
        symbol: "UBQ",
        cmcId: "588",
        categories: ["EVM"],
        chainId: 8,
    },
    "Mixin": {
        geckoId: "mixin",
        symbol: "XIN",
        cmcId: "2349",
    },
    "Everscale": {
        geckoId: "everscale",
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
        categories: ["EVM"],
        chainId: 106,
    },
    "Polkadot": {
        geckoId: "polkadot",
        symbol: "DOT",
        cmcId: "6636",
    },
    "CosmosHub": {
        geckoId: "cosmos",
        symbol: "ATOM",
        cmcId: "3794",
    },
    "EthereumClassic": {
        geckoId: "ethereum-classic",
        symbol: "ETC",
        cmcId: "1321",
        categories: ["EVM"],
        chainId: 61,
    },
    "Sora": {
        geckoId: "sora",
        symbol: "XOR",
        cmcId: "5802",
    },
    "Aurora": {
        geckoId: "aurora-near",
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
        symbol: "RON",
        cmcId: null,
        categories: ["EVM"],
        chainId: 2020,
    },
    "ZKsync Lite": {
        geckoId: null,
        symbol: null,
        cmcId: null,
        categories: ["Rollup"],
        parent: {
            chain: "Ethereum",
            types: ["L2", "gas"]
        },
    },
    "SmartBCH": {
        geckoId: "bitcoin-cash",
        symbol: "BCH",
        cmcId: "1831",
        categories: ["EVM"],
        chainId: 10000,
    },
    "Godwoken": {
        geckoId: null,
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
        symbol: "CLO",
        cmcId: "2757",
        categories: ["EVM"],
        chainId: 820,
    },
    "CSC": {
        geckoId: "coinex-token",
        symbol: "CET",
        cmcId: "2941",
        categories: ["EVM"],
        chainId: 52,
    },
    "Ergo": {
        geckoId: "ergo",
        symbol: "ERG",
        cmcId: "1555",
    },
    "Cardano": {
        geckoId: "cardano",
        symbol: "ADA",
        cmcId: "2010",
    },
    "Liquidchain": {
        geckoId: "liquidchain",
        symbol: "XLC",
        cmcId: null,
        categories: ["EVM"],
        chainId: 5050,
    },
    "Nahmii": {
        geckoId: "nahmii",
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
        symbol: "MTRG",
        cmcId: "5919",
        categories: ["EVM"],
        chainId: 82,
    },
    "Oasis": {
        geckoId: "oasis-network",
        symbol: "ROSE",
        cmcId: "7653",
        categories: ["EVM"],
        chainId: 42262,
    },
    "Theta": {
        geckoId: "theta-token",
        symbol: "THETA",
        cmcId: "2416",
        categories: ["EVM"],
        chainId: 361,
    },
    "Syscoin": {
        geckoId: "syscoin",
        symbol: "SYS",
        cmcId: "541",
        categories: ["EVM"],
        chainId: 57,
    },
    "Moonbeam": {
        geckoId: "moonbeam",
        symbol: "GLMR",
        cmcId: "6836",
        categories: ["EVM", "Parachain"],
        parent: {
            chain: "Polkadot",
            types: ["parachain"]
        },
        chainId: 1284,
    },
    "Astar": {
        geckoId: "astar",
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
        symbol: null,
        cmcId: null,
        categories: ["EVM"],
        parent: {
            chain: "SKALE",
            types: ["skale"]
        },
        chainId: 836542336838601,
    },
    "SKALE": {
        geckoId: "skale",
        symbol: "SKL",
        cmcId: "5691",
        categories: ["EVM"],
    },
    "Bittorrent": {
        geckoId: "bittorrent",
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
        symbol: "WAXP",
        cmcId: "2300",
    },
    "Evmos": {
        geckoId: "evmos",
        symbol: "EVMOS",
        cmcId: null,
        categories: ["EVM", "Cosmos"],
        chainId: "9001",
    },
    "Proton": {
        geckoId: "proton",
        symbol: "XPR",
        cmcId: "5350",
    },
    "Kadena": {
        geckoId: "kadena",
        symbol: "KDA",
        cmcId: "5647",
    },
    "Vite": {
        geckoId: "vite",
        symbol: "VITE",
        cmcId: "2937",
    },
    "Milkomeda C1": {
        geckoId: null,
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
        symbol: "REI",
        cmcId: "19819",
        categories: ["EVM"],
        chainId: 47805,
    },
    "Crab": {
        geckoId: "darwinia-crab-network",
        symbol: "CRAB",
        cmcId: "9243",
        categories: ["EVM"],
        chainId: 44,
    },
    "Hedera": {
        geckoId: "hedera-hashgraph",
        symbol: "HBAR",
        cmcId: "4642",
        categories: ["EVM"],
    },
    "Findora": {
        geckoId: "findora",
        symbol: "FRA",
        cmcId: "4249",
        categories: ["EVM"],
        chainId: 2152,
    },
    "Hydra": {
        geckoId: "hydra",
        symbol: "HYDRA",
        cmcId: "8245",
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
    },
    "Bifrost": {
        geckoId: "bifrost-native-coin",
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
        symbol: "LA",
        cmcId: "2090",
        categories: ["EVM"],
        chainId: 225,
    },
    "Coti": {
        geckoId: "coti",
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
        symbol: "LTC",
        cmcId: "2",
    },
    "Doge": {
        geckoId: "dogecoin",
        symbol: "DOGE",
        cmcId: "74",
    },
    "Obyte": {
        geckoId: "byteball",
        symbol: "GBYTE",
        cmcId: "1492",
    },
    "REIchain": {
        geckoId: null,
        symbol: null,
        cmcId: null,
        categories: ["EVM"],
        chainId: 55555,
    },
    "OntologyEVM": {
        geckoId: "ong",
        symbol: "ONG",
        cmcId: "3217",
        categories: ["EVM"],
        chainId: 58,
    },
    "Carbon": {
        geckoId: "switcheo",
        symbol: "SWTH",
        cmcId: "2620",
        categories: ["Cosmos"],
    },
    "Neo3": {
        geckoId: null,
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
        symbol: "BTM",
        cmcId: "1866",
        categories: ["EVM"],
    },
    "Starcoin": {
        geckoId: "starcoin",
        symbol: "STC",
        cmcId: "10202",
    },
    "Terra2": {
        geckoId: "terra-luna-2",
        symbol: "LUNA",
        cmcId: "20314",
        categories: ["Cosmos"],
    },
    "SXnetwork": {
        geckoId: "sx-network",
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
        symbol: "MTV",
        cmcId: "3853",
    },
    "ORE": {
        geckoId: "ptokens-ore",
        symbol: "ORE",
        cmcId: "12743",
    },
    "LBRY": {
        geckoId: "lbry-credits",
        symbol: "LBC",
        cmcId: "1298",
    },
    "Ravencoin": {
        geckoId: "ravencoin",
        symbol: "RVN",
        cmcId: "2577",
    },
    "Acala": {
        geckoId: "acala",
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
        symbol: "ICP",
        cmcId: "8916",
    },
    "Nova Network": {
        geckoId: "supernova",
        symbol: "SNT",
        cmcId: "15399",
        categories: ["EVM"],
        chainId: 87,
    },
    "Kintsugi": {
        geckoId: "kintsugi",
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
        symbol: "FIL",
        cmcId: "2280",
        categories: ["EVM"],
    },
    "Flow": {
        geckoId: "flow",
        symbol: "FLOW",
        cmcId: "4558",
    },
    "Kujira": {
        geckoId: "kujira",
        symbol: "KUJI",
        cmcId: "15185",
        categories: ["Cosmos"],
    },
    "Heiko": {
        geckoId: null,
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
        symbol: "DG",
        cmcId: null,
        categories: ["EVM"],
    },
    "Canto": {
        geckoId: "canto",
        symbol: "CANTO",
        cmcId: "21516",
        categories: ["EVM", "Cosmos"],
    },
    "Ripple": {
        geckoId: "ripple",
        symbol: "XRP",
        cmcId: "52",
    },
    "GodwokenV1": {
        geckoId: null,
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
        symbol: "ULX",
        cmcId: "21524",
        categories: ["EVM"],
        chainId: 1231,
    },
    "Interlay": {
        geckoId: "interlay",
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
        symbol: "JUNO",
        cmcId: "14299",
        categories: ["Cosmos"],
    },
    "Tombchain": {
        geckoId: "tomb",
        symbol: "TOMB",
        cmcId: "11495",
        categories: ["EVM"],
    },
    "Crescent": {
        geckoId: "crescent-network",
        symbol: "CRE",
        cmcId: null,
        categories: ["Cosmos"],
    },
    "Vision": {
        geckoId: "vision-metaverse",
        symbol: "VS",
        cmcId: "19083",
        categories: ["EVM"],
    },
    "EthereumPoW": {
        geckoId: "ethereum-pow-iou",
        symbol: "ETHW",
        cmcId: "21296",
        categories: ["EVM"],
    },
    "Cube": {
        geckoId: "cube-network",
        symbol: "CUBE",
        cmcId: "20519",
        categories: ["EVM"],
        chainId: 1818,
    },
    "FunctionX": {
        geckoId: "fx-coin",
        symbol: "FX",
        cmcId: "3884",
        categories: ["EVM"],
    },
    "Aptos": {
        geckoId: "aptos",
        symbol: "APT",
        cmcId: "21794",
    },
    "Kekchain": {
        geckoId: "kekchain",
        symbol: "KEK",
        cmcId: "21606",
        categories: ["EVM"],
        chainId: 420420,
    },
    "Milkomeda A1": {
        geckoId: null,
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
        symbol: "TON",
        cmcId: "11419",
    },
    "Starknet": {
        geckoId: "starknet",
        symbol: "STRK",
        cmcId: null,
    },
    "Dexit": {
        geckoId: "dexit-finance",
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
        symbol: null,
        cmcId: null,
        categories: ["EVM"],
    },
    "Boba_Bnb": {
        geckoId: null,
        symbol: null,
        cmcId: null,
        categories: ["EVM"],
    },
    "Comdex": {
        geckoId: "comdex",
        symbol: "CMDX",
        cmcId: "14713",
        categories: ["Cosmos"],
    },
    "Flare": {
        geckoId: "flare-networks",
        symbol: "FLR",
        cmcId: "4172",
        categories: ["EVM"],
    },
    "Tlchain": {
        geckoId: "tlchain",
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
        symbol: "BNI",
        cmcId: "22026",
        categories: ["EVM"],
    },
    "Map": {
        geckoId: "marcopolo",
        symbol: "MAP",
        cmcId: "4956",
        categories: ["EVM"],
    },
    "Stargaze": {
        geckoId: "stargaze",
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
        symbol: "UMEE",
        cmcId: "16389",
        categories: ["Cosmos"],
    },
    "WEMIX": {
        geckoId: "wemix-token",
        symbol: "WEMIX",
        cmcId: "7548",
    },
    "Persistence": {
        geckoId: "persistence",
        symbol: "XPRT",
        cmcId: "7281",
        categories: ["Cosmos"],
    },
    "ENULS": {
        geckoId: null,
        symbol: null,
        cmcId: null,
        categories: ["EVM"],
    },
    "Oraichain": {
        geckoId: "oraichain-token",
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
        symbol: null,
        cmcId: null,
        categories: ["EVM"],
    },
    "CORE": {
        geckoId: "coredaoorg",
        symbol: "CORE",
        cmcId: "23254",
        categories: ["EVM"],
    },
    "Rangers": {
        geckoId: "rangers-protocol-gas",
        symbol: "RPG",
        cmcId: "12221",
        categories: ["EVM"],
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
        geckoId: null,
        symbol: null,
        cmcId: null,
        categories: ["EVM", "Rollup"],
        parent: {
            chain: "Ethereum",
            types: ["L2", "gas"]
        },
        chainId: 324,
    },
    "Base": {
        geckoId: null,
        symbol: null,
        cmcId: null,
        categories: [
            "EVM"
        ],
        chainId: 8453
    },
    "Op_Bnb": {
        geckoId: null,
        symbol: null,
        cmcId: null,
        categories: ["EVM"],
        chainId: 204,
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
    },
    "Bitlayer": {
        geckoId: null,
        symbol: null,
        cmcId: null,
        twitter: "BitlayerLabs",
        github: ["bitlayer-org"],
        chainId: 200901,
        url: "https://www.bitlayer.org"
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
