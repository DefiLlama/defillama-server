import { AdaptorsConfig } from "../types"

export default {
    "aave": {
        "startFrom": 1647648000,
        "id": "111",
        parentId: "AAVE",
        protocolsData: {
            /*  v1: {
                 "id": "1838",
                 enabled: false,
             }, */
            v2: {
                "id": "111",
            },
            v3: {
                "id": "1599",
            }
        }
    },
    "angle": {
        "id": "756"
    },
    "balancer": {
        "id": "116",
        parentId: "Balancer",
        protocolsData: {
            v1: {
                id: "116",
                displayName: "Balancer V1"
            },
            v2: {
                id: "2611",
                displayName: "Balancer V2"
            }
        }
    },
    "biswap": {
        parentId: "BiSwap",
        "id": "373"
    },
    "bitcoin": {
        "id": "1",
        "isChain": true
    },
    "bsc": {
        "id": "56"
    },
    "compound": {
        parentId: "Compound Finance",
        "id": "114"
    },
    "convex": {
        "id": "319"
    },
    "curve": {
        "id": "3"
    },
    "doge": {
        "id": "74"
    },
    "ethereum": {
        "id": "1027",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1651449600": true
            },
        }
    },
    "frax-swap": {
        parentId: "Frax Finance",
        "id": "2121"
    },
    "gmx": {
        "id": "337",
        parentId: "GMX"
    },
    "lido": {
        "id": "182"
    },
    "litecoin": {
        "id": "2",
        "isChain": true
    },
    "looksrare": {
        "id": "1229"
    },
    "makerdao": {
        "id": "118"
    },
    "mooniswap": {
        "id": "1053"
    },
    "opensea": {
        "id": "2258",
        parentId: "OpenSea",
        protocolsData: {
            v1: {
                "id": "2630",
                disabled: true,
                displayName: "Opensea V1"
            },
            v2: {
                "id": "2631",
                disabled: true,
                displayName: "Opensea V2"
            },
            seaport: {
                "id": "2258",
                displayName: "Opensea Seaport"
            }
        }
    },
    "osmosis": {
        "id": "383"
    },
    // "pancakeswap": {
    //     parentId: "PancakeSwap",
    //     protocolsData: {
    //         v1: {
    //             "disabled": true,
    //             "id": "2590"
    //         },
    //         v2: {
    //             "id": "194"
    //         },
    //         stableswap: {
    //             "id": "2529"
    //         },
    //         v3: {
    //             "id": "2769"
    //         }
    //     },
    //     "id": "194"
    // },
    "pangolin": {
        "id": "246"
    },
    "quickswap": {
        "id": "306",
        parentId: "Quickswap",
        protocolsData: {
            v2: {
                id: "306",
                displayName: "Quickswap V2"
            },
            v3: {
                id: "2239",
            }
        }
    },
    "raydium": {
        "id": "214"
    },
    "spookyswap": {
        "id": "302"
    },
    "sushiswap": {
        "id": "119",
        parentId: "Sushi",
        protocolsData: {
            classic: {
                id: "119",
            },
            trident: {
                id: "2152",
            },
            v3: {
                id: "2776"
            }
        }
    },
    "synthetix": {
        "id": "115"
    },
    "tarot": {
        "id": "434"
    },
    "traderjoe": {
        "id": "468",
        parentId: "Trader Joe",
        protocolsData: {
            v1: {
                id: "468",
            },
            v2: {
                id: "2393",
            }
        }
    },
    // "uniswap": {
    //     "id": "1",
    //     parentId: "Uniswap",
    //     "protocolsData": {
    //         "v1": {
    //             "id": "2196"
    //         },
    //         "v2": {
    //             "id": "2197"
    //         },
    //         "v3": {
    //             "id": "2198"
    //         },
    //     },
    // },
    "velodrome": {
        parentId: "Velodrome",
        "id": "1799"
    },
    "wombat-exchange": {
        "id": "1700"
    },
    "woofi": {
        parentId: "WOOFi",
        "id": "1461"
    },
    "metavault.trade": {
        parentId: "MetaVault",
        "id": "1801"
    },
    "aurora": {
        "id": "1313161554"
    },
    "celo": {
        "id": "42220"
    },
    "optimism": {
        "category": "Rollup",
        "id": "10"
    },
    "moonbeam": {
        "id": "1284"
    },
    "moonriver": {
        "id": "1285"
    },
    "tron": {
        "id": "1958"
    },
    "arbitrum": {
        "category": "Rollup",
        "startFrom": 1660608000,
        "id": "42161"
    },
    "avalanche": {
        "id": "43114"
    },
    "canto": {
        "id": "21516"
    },
    "cardano": {
        "id": "2010"
    },
    "cronos": {
        "id": "25"
    },
    "klaytn": {
        "enabled": false,
        "id": "4256" // wrong id, not related to klaytn
    },
    "dodo-fees": {
        "id": "146",
        protocolsData: {
            "dodo": {
                "id": "146",
            }
        }
    },
    "fantom": {
        "id": "250"
    },
    "mixin": {
        "enabled": false,
        "id": "2349" // wrond id, not linked to mixin
    },
    "polygon": {
        "id": "137"
    },
    "solana": {
        "id": "5426"
    },
    "xdai": {
        "id": "100"
    },
    "abracadabra": {
        "id": "347"
    },
    "liquity": {
        "id": "270"
    },
    "geist-finance": {
        disabled: true,
        "id": "643"
    },
    "boba": {
        "enabled": false, // Error: INDEXA_DB not set
        "id": "14556" // Boba bridge id should be 3935
    },
    "mojitoswap": {
        "id": "1181"
    },
    "mimo": {
        "id": "1241"
    },
    "junoswap": {
        disabled: true,
        "id": "2052"
    },
    "honeyswap": {
        "id": "271"
    },
    "solarbeam": {
        "id": "551"
    },
    "spiritswap": {
        parentId: "SpiritSwap",
        "id": "311"
    },
    "apeswap": {
        parentId: "ApeSwap",
        "id": "398"
    },
    "nomiswap": {
        "enabled": false,
        "id": "1823"
    },
    "stellaswap": {
        "id": "1274"
    },
    "lifinity": {
        "id": "2154"
    },
    "shibaswap": {
        "id": "397"
    },
    "perp88": {
        "id": "2296"
    },
    "mux": {
        "name": "MUX Protocol",
        "id": "2254"
    },
    "emdx": {
        "id": "2299"
    },
    "defi-swap": {
        "id": "221"
    },
    "babydogeswap": {
        "id": "2169"
    },
    "stargate": {
        parentId: "Stargate Finance",
        "id": "1571"
    },
    "mm-stableswap-polygon": {
        parentId: "MM Finance",
        "id": "2015"
    },
    "elk": {
        "id": "420"
    },
    "lyra": {
        parentId: "Derive",
        "id": "503"
    },
    "radioshack": {
        "id": "1616"
    },
    "valas-finance": {
        disabled: true,
        "id": "1584"
    },
    "gains-network": {
        "id": "1018"
    },
    "ghostmarket": {
        disabled: true,
        category: "NFT Marketplace",
        allAddresses: [
            "neo:0x9b049f1283515eef1d3f6ac610e1595ed25ca3e9",
            "ethereum:0x35609dc59e15d03c5c865507e1348fa5abb319a8",
            "polygon:0x6a335ac6a3cdf444967fe03e7b6b273c86043990",
            "avax:0x0b53b5da7d0f275c31a6a182622bdf02474af253",
            "bsc:0x0b53b5da7d0f275c31a6a182622bdf02474af253"
        ],
        "id": "2290"
    },
    "moonwell-artemis": {
        "enabled": false, // ClientError: auth error: payment required for subsequent requests for this API key:
        "id": "1853"
    },
    "moonwell-apollo": {
        "id": "1401"
    },
    "kperp-exchange": {
        "disabled": true,
        "id": "2326"
    },
    "premia": {
        "id": "381",
        parentId: "Premia",
        protocolsData: {
            v2: {
                id: "381",
            },
            v3: {
                id: "3497",
            }
        }
    },
    "kyberswap": {
        "id": "127",
        parentId: "KyberSwap",
        protocolsData: {
            classic: {
                id: "127",
                displayName: "KyberSwap - Classic"
            },
            elastic: {
                id: "2615",
                displayName: "KyberSwap - Elastic"
            }
        }
    },
    "llamalend": {
        "id": "2252"
    },
    "0vix": {
        disabled: true,
        "id": "1614"
    },
    "mummy-finance": {
        "id": "2361"
    },
    "bluemove": {
        "id": "2396"
    },
    "hegic": {
        "id": "128"
    },
    "el-dorado-exchange": {
        parentId: "EDE",
        disabled: true,
        "id": "2356"
    },
    "gearbox": {
        "id": "1108"
    },
    "predy-finance": {
        "id": "1657",
        parentId: "Predy Finance",
        protocolsData: {
            "v320": {
                id: "1657",
                disabled: true
            },
            "v5": {
                id: "3324",
                enabled: true
            }
        }
    },
    "verse": {
        "id": "1732"
    },
    "level-finance": {
        "id": "2395"
    },
    "blur": {
        "id": "2414"
    },
    "solidlydex": {
        "id": "2400"
    },
    "archly-finance": {
        "id": "2317"
    },
    "stride": {
        "id": "2251"
    },
    "plenty": {
        "id": "490"
    },
    "firebird-finance": {
        "id": "384"
    },
    "x2y2": {
        "id": "1431"
    },
    "buffer": {
        "id": "1304"
    },
    "betswirl": {
        "id": "1911"
    },
    "zonic": {
        "id": "2532"
    },
    "covo-finance": {
        parentId: "Covo Finance",
        "enabled": false, // ClientError: auth error: payment required for subsequent requests for this API key:
        "id": "2525"
    },
    "nftearth": {
        "id": "2546"
    },
    "liquid-bolt": {
        "id": "2513"
    },
    "frax-ether": {
        parentId: "Frax Finance",
        "id": "2221"
    },
    "frax-fpi": {
        parentId: "Frax Finance",
        id: "2607"
    },
    "zora": {
        id: "2610"
    },
    "solidlizard": {
        id: "2528"
    },
    "zyberswap": {
        id: "2467",
        parentId: "ZyberSwap",
        protocolsData: {
            "v2": {
                id: "2467",
                enabled: true
            },
            "v3": {
                id: "2602",
                enabled: true
            },
            "stable": {
                id: "2530",
                enabled: true
            }
        }
    },
    "cow-protocol": {
        id: "2643"
    },
    "maverick": {
        parentId: "Maverick Protocol",
        id: "2644"
    },
    "equalizer-exchange": {
        parentId: "Equalizer",
        id: "2332"
    },
    "camelot-v2": {
        parentId: "Camelot",
        id: "2307"
    },
    "thena-v1": {
        name: "Thena V1",
        displayName: "Thena V1",
        id: "2417"
    },
    "paraswap": {
        id: "894",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1684800000": true
            },
        }
    },
    "ramses-exchange-v1": {
        parentId: "Ramses Exchange",
        enabled: false, // ClientError: auth error: payment required for subsequent requests for this API key:
        id: "2675"
    },
    "blastapi": {
        id: "2734"
    },
    "get-protocol": {
        id: "2735"
    },
    "radiant": {
        id: "2706"
    },
    "chainlink-vrf-v1": {
        parentId: "Chainlink",
        displayName: "Chainlink VRF V1",
        id: "3339"
    },
    "chainlink-vrf-v2": {
        parentId: "Chainlink",
        displayName: "Chainlink VRF V2",
        id: "3340"
    },
    "chainlink-keepers": {
        parentId: "Chainlink",
        displayName: "Chainlink Keepers",
        id: "3338"
    },
    "chainlink-requests": {
        parentId: "Chainlink",
        displayName: "Chainlink Requests",
        id: "2623"
    },
    "aura": {
        id: "1918"
    },
    "synapse": {
        id: "657"
    },
    "plexus": {
        id: "2740"
    },
    "vela": {
        id: "2548"
    },
    "equilibre-exchange": {
        id: "2586"
    },
    "waves": {
        id: "1274",
        isChain: true
    },
    "maia-v3": {
        "id": "2760"
    },
    "morphex": {
        parentId: "Morphex",
        "id": "2662"
    },
    "kyotoswap": {
        "id": "2350"
    },
    "sonne-finance": {
        "id": "2142"
    },
    "SmarDex": {
        "id": "2695"
    },
    "ens": {
        "id": "2519"
    },
    "azuro": {
        "id": "1892"
    },
    "covo-v2": {
        "id": "2730",
        parentId: "Covo Finance",
        cleanRecordsConfig: {
            genuineSpikes: true
        }
    },
    "camelot-v3": {
        parentId: "Camelot",
        "id": "2792"
    },
    "auragi": {
        "id": "2773"
    },
    "vesta-finance": {
        "id": "1444"
    },
    "thena-v3": {
        parentId: "Thena",
        "id": "2864"
    },
    "merlin": {
        disabled: true,
        "id": "2849"
    },
    "hydradex": {
        "id": "1673",
        protocolsData: {
            v2: {
                disabled: true,
                "id": "1673",
                displayName: "Hydradex V2"
            },
            v3: {
                "id": "2910",
                displayName: "Hydradex V3"
            }
        }
    },
    "smbswap": {
        parentId: "SMBSwap",
        id: "1632",
        protocolsData: {
            v2: {
                "id": "1632"
            },
            v3: {
                "id": "2895"
            }
        },
    },
    "pika-protocol": {
        parentId: "Pika Protocol",
        "id": "916"
    },
    "chronos": {
        "id": "2907"
    },
    "unidex": {
        "id": "1833"
    },
    "joe-v2.1": {
        parentId: "Trader Joe",
        "id": "2906"
    },
    "e3": {
        "id": "2926"
    },
    "airswap": {
        "id": "2954"
    },
    "ArbitrumExchange": {
        "id": "2685",
        protocolsData: {
            v2: {
                "id": "2685",
                displayName: "Arbitrum Exchange V2"
            },
            v3: {
                "id": "2962",
                displayName: "Arbitrum Exchange V3"
            }
        }
    },
    "across": {
        "id": "1207"
    },
    "gnd-protocol": {
        "id": "2968"
    },
    "kwenta": {
        disabled: true,
        "id": "2981"
    },
    "gamma": {
        "id": "355"
    },
    "fulcrom-finance": {
        "id": "2641"
    },
    "veax": {
        "enabled": false, // no file for veax in fees folder
        "id": "2928"
    },
    "maestro": {
        "id": "3019"
    },
    "forge": {
        "id": "2804"
    },
    "metamask": {
        "id": "3031"
    },
    "rainbow-wallet": {
        "id": "3038"
    },
    "lybra-finance": {
        parentId: "Lybra Finance",
        "id": "2904"
    },
    "houdini-swap": {
        "id": "3041"
    },
    "unlimited-network": {
        "id": "3055"
    },
    "cryptex-v2": {
        parentId: "Cryptex Finance",
        "id": "3051"
    },
    "usdo": {
        "id": "3098"
    },
    "unibot": {
        "id": "3106"
    },
    "ramses-exchange-v2": {
        parentId: "Ramses Exchange",
        id: "3096"
    },
    "abcdefx": {
        id: "2376"
    },
    "liondex": {
        disabled: true,
        id: "2898"
    },
    "stealcam": {
        id: "3123"
    },
    "pearlfi": {
        id: "3121"
    },
    "scatter": {
        id: "3146"
    },
    "alchemix": {
        id: "204"
    },
    "doveswap": {
        "id": "2763",
        parentId: "Dove Swap",
        "protocolsData": {
            "v3": {
                "id": "2809",
            }
        },
    },
    "foundation": {
        id: "3168"
    },
    "thalaswap": {
        parentId: "Thala Labs",
        id: "2795"
    },
    "y2k": {
        parentId: "Y2K Finance",
        id: "2375",
        "protocolsData": {
            "v1": {
                "id": "2375",
            },
            "v2": {
                "id": "3056",
            }
        },
    },
    "yield-yak-staked-avax": {
        id: "475"
    },
    "voodoo-trade": {
        id: "3792"
    },
    "equity": {
        parentId: "Equalizer",
        id: "3173"
    },
    "pendle": {
        id: "382"
    },
    "move-dollar": {
        parentId: "Thala Labs",
        id: "2789"
    },
    "pinnako": {
        id: "3209"
    },
    "DerpDEX": {
        id: "3234"
    },
    "wigoswap": {
        "id": "1351"
    },
    "apollox": {
        "id": "1772"
    },
    "concordex-io": {
        "enabled": false, // file doesn't exist
        "id": "3172"
    },
    "vvs-finance": {
        "id": "831"
    },
    "agni-fi": {
        "id": "3265"
    },
    "benqi-lending": {
        parentId: "Benqi",
        "id": "467"
    },
    "pika-protocol-v4": {
        parentId: "Pika Protocol",
        "id": "3281"
    },
    "holdstation-defutures": {
        "id": "2959"
    },
    "unicrypt": {
        parentId: "UniCrypt",
        "id": "1765"
    },
    "0x0dex": {
        "id": "3264"
    },
    "base": {
        "category": "Rollup",
        "id": "8453"
    },
    "velodrome-v2": {
        parentId: "Velodrome",
        "id": "3302"
    },
    "sobal": {
        "id": "3246"
    },
    "reserve": {
        "id": "626"
    },
    "grizzly-trade": {
        disabled: true,
        "id": "3301"
    },
    "rollup-finace": {
        "id": "2889"
    },
    "ktx": {
        "id": "3025"
    },
    "zunami": {
        "id": "1201"
    },
    "fusionx-v3": {
        parentId: "FusionX Finance",
        id: "3239"
    },
    "ferro": {
        "id": "1882"
    },
    "satori": {
        "id": "2982"
    },
    "fcon-dex": {
        disabled: true,
        "id": "3299"
    },
    "friend-tech": {
        "id": "3377"
    },
    "fusionx-v2": {
        parentId: "FusionX Finance",
        id: "3238"
    },
    "vertex-protocol": {
        "id": "2899"
    },
    "edebase": {
        parentId: "EDE",
        "id": "3375"
    },
    "venus-finance": {
        "id": "212",
        "enabled": true
    },
    "none-trading-bot": {
        disabled: true,
        "id": "3337",
        "enabled": true
    },
    "dackieswap": {
        parentId: "DackieSwap",
        "id": "3345"
    },
    "banana-gun-trading": {
        "id": "3336"
    },
    "lynex": {
        "id": "3408"
    },
    "op-bnb": {
        "id": "204",
        "isChain": true
    },
    "meowl": {
        "id": "3418"
    },
    "qidao": {
        "id": "449"
    },
    "zksync-era": {
        "category": "Rollup",
        "id": "324"
    },
    "meridian-trade": {
        "enabled": false, // request to https://subgraph.meridianfinance.net/subgraphs/name/perpetuals-stats failed, reason: connect ECONNREFUSED 137.184.25.57:443
        "id": "3386"
    },
    "baseswap": {
        "id": "3333",
        parentId: "BaseSwap",
        "protocolsData": {
            "v2": {
                "id": "3333",
            },
            "v3": {
                "id": "3507",
            }
        }
    },
    "yfx-v3": {
        "id": "3429"
    },
    "gmx-v2": {
        parentId: "GMX",
        "id": "3365"
    },
    "swapbased": {
        parentId: "SwapBased",
        "id": "3328",
        protocolsData: {
            "v2": {
                "id": "3328",
            }
        },
    },
    "danogo": {
        "id": "3454"
    },
    "sharesgram": {
        "enabled": false, // only returns 0 for fees everytime
        "id": "3464"
    },
    "tigris": {
        "enabled": false, // has several dates with { "error" : { "S" : "Request failed with status code 500" } }
        "id": "3129"
    },
    "apex": {
        parentId: "ApeX Protocol",
        "id": "1878"
    },
    "lybra-v2": {
        parentId: "Lybra Finance",
        "id": "3468"
    },
    "morphex-old": {
        parentId: "Morphex",
        "id": "3483"
    },
    "pact": {
        "id": "1468"
    },
    "friend-room": {
        "id": "3493",
        "enabled": true
    },
    "liquis": {
        "id": "3498",
        "enabled": true
    },
    "dackieswap-v2": {
        parentId: "DackieSwap",
        "id": "3515",
    },
    "basepaint": {
        "id": "3519"
    },
    "monarchpay": {
        "id": "3520"
    },
    "perpetual-protocol": {
        "id": "362"
    },
    "nether-fi": {
        "id": "3509"
    },
    "extra": {
        "id": "2974"
    },
    "blazebot": {
        disabled: true,
        "id": "3527"
    },
    "stakewise": {
        "id": "277"
    },
    "bmx": {
        parentId: "Morphex",
        "id": "3530"
    },
    "mango-v4": {
        parentId: "Mango Markets",
        "id": "3174"
    },
    "hono": {
        "id": "3532"
    },
    "thena-perp": {
        parentId: "Thena",
        "id": "3537",
    },
    "post-tech": {
        "id": "3535",
    },
    "ekubo": {
        "id": "3499"
    },
    "tangible-rwa": {
        parentId: "Tangible",
        "id": "2231"
    },
    "caviar-tangible": {
        parentId: "Tangible",
        "id": "3528"
    },
    "solidly-v3": {
        parentId: "Solidly Labs",
        "id": "3481"
    },
    "friend3": {
        "id": "3566"
    },
    "Scale": {
        parentId: "Equalizer",
        "id": "3575"
    },
    "stars-arena": {
        "id": "3564"
    },
    "based-markets": {
        "id": "3609"
    },
    "allbridge-core": {
        "id": "3944"
    },
    "cipher": {
        "id": "3563"
    },
    "blex": {
        "id": "3605"
    },
    "sudoswap-v1": {
        parentId: "Sudoswap",
        "id": "1917"
    },
    "sudoswap-v2": {
        parentId: "Sudoswap",
        "id": "3095"
    },
    "xena-finance": {
        "id": "3620"
    },
    "gambit": {
        "id": "3325"
    },
    "tangleswap": {
        "id": "3585"
    },
    "uniswap-lab": {
        "id": "3657"
    },
    "shimmersea": {
        parentId: "MagicSea",
        "id": "3571"
    },
    "vapordex": {
        "id": "2342",
        protocolsData: {
            v2: {
                "id": "3654",
            }
        }
    },
    "chainlink-ccip": {
        parentId: "Chainlink",
        "id": "3675"
    },
    "crv-usd": {
        parentId: "Curve Finance",
        "id": "2994"
    },
    "shuriken": {
        "id": "3687"
    },
    "clipper": {
        "id": "622"
    },
    "morpho-compound": {
        parentId: "Morpho",
        "enabled": false, // https://discord.com/channels/823822164956151810/1022274454451142800/1166542892999913583
        "id": "1997"
    },
    "benqi-staked-avax": {
        parentId: "Benqi",
        "id": "1427"
    },
    "prisma-finance": {
        "id": "3473"
    },
    "impermax-finance": {
        "id": "343"
    },
    "defi-saver": {
        "id": "177"
    },
    "zapper-channels": {
        "id": "3703"
    },
    "valorem": {
        "id": "3501"
    },
    "clever": {
        "id": "1707"
    },
    "concentrator": {
        "id": "1544"
    },
    "touch.fan": {
        "id": "3713"
    },
    "paal-ai": {
        "id": "3723"
    },
    "retro": {
        "id": "3311"
    },
    "hipo": {
        "id": "3722"
    },
    "intent-x": {
        "id": "3747"
    },
    "caviarnine-lsu-pool": {
        parentId: "CaviarNine",
        "id": "3666"
    },
    "caviarnine-shape-liquidity": {
        "id": "3645"
    },
    "metavault-v3": {
        parentId: "Metavault",
        "enabled": false,
        "id": "3750",
        protocolsData: {
            "v3": {
                "id": "3750",
            }
        }
    },
    "xoxno": {
        "id": "3753"
    },
    "equation": {
        parentId: "Equation",
        "id": "3726"
    },
    "hopr": {
        "id": "3761"
    },
    "solend": {
        "id": "458"
    },
    "thorswap": {
        "id": "412"
    },
    "amphor": {
        "id": "3643"
    },
    "dydx": {
        parentId: "dYdX",
        "id": "144",
        disabled: true
    },
    "justlend": {
        "id": "494"
    },
    "wagmi": {
        "id": "2837"
    },
    "chimpexchange": {
        "id": "3836"
    },
    "dln": {
        "id": "1462"
    },
    "near": {
        "id": "6535"
    },
    "substanceX": {
        "id": "3835"
    },
    "up-vs-down-game": {
        "id": "3872"
    },
    "aimbot": {
        "id": "3875"
    },
    "sns": {
        "id": "3877"
    },
    "thick": {
        "id": "3878"
    },
    "noah-swap": {
        "id": "2855"
    },
    "stormtrade": {
        "id": "3883"
    },
    "beethoven-x": {
        parentId: "Beethoven X",
        "id": "654"
    },
    "ascent-v2": {
        parentId: "Ascent Exchange",
        "id": "3867"
    },
    "ascent-v3": {
        parentId: "Ascent Exchange",
        "id": "3868"
    },
    "xfai": {
        "id": "3816"
    },
    "defiplaza": {
        "id": "728"
    },
    "butterxyz": {
        "id": "3918"
    },
    "pharaoh-exchange": {
        "id": "3921"
    },
    "metavault-derivatives-v2": {
        parentId: "Metavault",
        "id": "3911"
    },
    "dopex": {
        parentId: "Dopex",
        "id": "3817",
        protocolsData: {
            "clamm": {
                "id": "3817",
            }
        }
    },
    "bluefin": {
        "id": "2625"
    },
    "odos": {
        "id": "3951"
    },
    "dexter": {
        id: "2737"
    },
    "fvm-exchange": {
        parentId: "Velocimeter",
        "id": "3291"
    },
    "kiloex": {
        "id": "3329"
    },
    "railgun": {
        "id": "1320"
    },
    "surfone": {
        "id": "3954"
    },
    "squa-defi": {
        "id": "3977"
    },
    "beamex": {
        parentId: "BeamSwap",
        "id": "3251"
    },
    "beamswap-v3": {
        parentId: "BeamSwap",
        "id": "3092",
        protocolsData: {
            "v3": {
                "id": "3092",
            }
        }
    },
    "beamswap": {
        parentId: "BeamSwap",
        "id": "1289"
    },
    "shoebillFinance-v2": {
        parentId: "Shoebill Finance",
        "id": "3548"
    },
    "pepe-swaves": {
        parentId: "PepeTeam",
        "id": "2351"
    },
    "maple-finance": {
        parentId: "Maple Finance",
        "id": "587"
    },
    "jibswap": {
        "id": "3928"
    },
    "cleopatra-exchange": {
        "id": "3985"
    },
    "immortalx": {
        "id": "3983"
    },
    "goku-money": {
        "id": "3758"
    },
    "allbridge-classic": {
        "id": "577"
    },
    "monocerus": {
        "id": "3622"
    },
    "first-crypto-bank": {
        id: "4017"
    },
    "fwx": {
        "id": "4026"
    },
    "keom": {
        "id": "3823"
    },
    "squadswap-v2": {
        parentId: "SquadSwap",
        "id": "4009"
    },
    "squadswap-v3": {
        parentId: "SquadSwap",
        "id": "4010"
    },
    "zerion-wallet": {
        "id": "4049"
    },
    "goldfinch": {
        "id": "703"
    },
    "zkswap-finance": {
        "id": "3180"
    },
    "horiza": {
        "id": "4041"
    },
    "manta": {
        category: "Rollup",
        "id": "169"
    },
    "equation-v2": {
        parentId: "Equation",
        "id": "4074"
    },
    "lexer": {
        "id": "4087"
    },
    "garden": {
        "id": "4086"
    },
    "hyperionx": {
        "id": "4094"
    },
    "kinetix-derivatives-v2": {
        parentId: "Kinetix",
        "id": "4110"
    },
    "pingu": {
        "id": "4102"
    },
    "supswap-v2": {
        parentId: "SupSwap",
        "id": "4117"
    },
    "supswap-v3": {
        parentId: "SupSwap",
        "id": "4118"
    },
    "vaultka": {
        "id": "2531"
    },
    "Omnidrome": {
        "id": "4119"
    },
    "marinade-liquid-staking": {
        parentId: "Marinade",
        "id": "484",
        "cleanRecordsConfig": {
            genuineSpikes: {
                "1708387200": true,
                "1708473600": true,
                "1708560000": true,
                "1708646400": true,
            }
        }
    },
    "marinade-native": {
        parentId: "Marinade",
        "id": "3672"
    },
    "dragonswap": {
        parentId: "DragonSwap",
        "id": "4138",
        protocolsData: {
            "v2": {
                "id": "4138",
            },
            "v3": {
                "id": "4139",
            }
        }
    },
    "inverse-finance": {
        parentId: "Inverse Finance",
        "id": "2433"
    },
    "furucombo": {
        "id": "742"
    },
    "instadapp": {
        "id": "4742" // old id: 120
    },
    "summer.fi": {
        "id": "4741"  // old id: 3284
    },
    "integral": {
        "id": "291"
    },
    "bonk-bot": {
        "id": "4227"
    },
    "lens-protocol": {
        "id": "4235"
    },
    "ethena": {
        "id": "4133"
    },
    "avantis": {
        "id": "4108"
    },
    "cellana-finance": {
        "id": "4194",
    },
    "nile-exchange": {
        parentId: "Nile Exchange",
        "id": "4072"
    },
    "nile-exchange-v1": {
        parentId: "Nile Exchange",
        "enabled": false,
        "id": "4285"
    },
    "primordium": {
        "id": "4293",
        enabled: true
    },
    "geodnet": {
        "id": "4304",
        enabled: true
    },
    "econia": {
        "id": "4128"
    },
    "sharpe-earn": {
        "id": "2756"
    },
    "morpho": {
        parentId: "Morpho",
        "id": "4025"
    },
    "blitz": {
        id: "4214",
    },
    "fx-protocol": {
        id: "3344"
    },
    "swop": {
        id: "613"
    },
    "javsphere": {
        id: "4366"
    },
    "frax-amo": {
        parentId: "Frax Finance",
        id: "359"
    },
    "keller": {
        parentId: "Keller Finance",
        id: "4388"
    },
    "koi-finance": {
        id: "2727"
    },
    "ash-perp": {
        id: "4426"
    },
    "optionBlitz": {
        id: "4396"
    },
    "pumpdotfun": {
        id: "4449"
    },
    "synthetix-v3": {
        id: "4446"
    },
    "beefy": {
        id: "326"
    },
    "etaswap": {
        "id": "4475"
    },
    "swych": {
        id: "4365",
    },
    "wbtc": {
        "id": "2"
    },
    "yologames": {
        id: "4495"
    },
    "fjord-foundry": {
        id: "4505",
        parentId: "Fjord Foundry",
        protocolsData: {
            "v2": {
                id: "4505"
            },
            "v1": {
                id: "4557"
            }
        },
        cleanRecordsConfig: {
            genuineSpikes: {
                "1713744000": true,
                "1713657600": true
            },
        }
    },
    "grizzly-trade-derivatives-v2": {
        id: "4506",
    },
    "merchant-moe-dex": {
        parentId: "Merchant Moe",
        id: "4006"
    },
    "hercules-v2": {
        parentId: "Hercules",
        id: "4372",
    },
    "hercules-v3": {
        parentId: "Hercules",
        id: "4373",
        enabled: true
    },
    "orby-network": {
        id: "4154"
    },
    "fantasy-top": {
        id: "4570"
    },
    "fluid": {
        id: "4167"
    },
    "bitlayer": {
        id: "200901"
    },
    "nuri-exchange-v1": {
        parentId: "Nuri Exchange",
        id: "4564"
    },
    "nuri-exchange-v2": {
        parentId: "Nuri Exchange",
        id: "4565"
    },
    "synfutures-v3": {
        parentId: "SynFutures",
        id: "4215"
    },
    "jito": {
        id: "2308"
    },
    "vfat": {
        id: "4602"
    },
    "ociswap": {
        id: "3646",
        parentId: "Ociswap",
        protocolsData: {
            "basic": {
                "id": "3646",
            },
            "precision": {
                "id": "4629",
            }
        },
        cleanRecordsConfig: {
            genuineSpikes: {
                "1715817600": true,
            }
        }
    },
    "dydx-v4": {
        parentId: "dYdX",
        id: "4067"
    },
    "polter": {
        id: "4152"
    },
    "equation-v3": {
        parentId: "Equation",
        id: "4586"
    },
    "Viridian": {
        id: "4631"
    },
    "yfx-v4": {
        id: "4674"
    },
    "basecamp": {
        id: "4693"
    },
    "blocxroute": {
        id: "4695"
    },
    "drift-protocol": {
        "id": "970",
        "protocolsData": {
            "derivatives": {
                "id": "970",
            }
        },
    },
    "keller-cl": {
        parentId: "Keller Finance",
        id: "4583"
    },
    "colony": {
        id: "1004"
    },
    "flashtrade": {
        "id": "4107",
    },
    "pumpup": {
        "id": "4736"
    },
    "coinbase-commerce": {
        "id": "4737"
    },
    "dragonswap-sei": {
        parentId: "Dragon Swap",
        id: "4720"
    },
    "wen-markets": {
        id: "4733"
    },
    "cellula": {
        id: "4705"
    },
    "clusters": {
        id: "4777"
    },
    "magpie": {
        parentId: "Magpie Ecosystem",
        id: "2271"
    },
    "time-fun": {
        id: "4786"
    },
    "cakepie": {
        parentId: "Magpie Ecosystem",
        id: "4007"
    },
    "milkyway": {
        id: "3953"
    },
    "penpie": {
        parentId: "Magpie Ecosystem",
        id: "3083"
    },
    "radpie": {
        parentId: "Magpie Ecosystem",
        id: "3555"
    },
    "sideshift": {
        id: "1895"
    },
    "tlx-finance": {
        id: "4555"
    },
    "moonshot": {
        id: "4813"
    },
    "jojo": {
        "id": "2320"
    },
    "lynex-v1": {
        parentId: "Lynex",
        id: "3908"
    },
    "linehub-perps": {
        parentId: "LineHub",
        id: "4842"
    },
    "scoop": {
        id: "4827"
    },
    "ether-fi": {
        parentId: "ether.fi",
        id: "4429"
    },
    "jup-ape": {
        parentId: "Jupiter",
        id: "4860"
    },
    "scallop": {
        parentId: "Scallop",
        id: "1961"
    },
    "d2finance": {
        id: "4846"
    },
    "eddyfinance-v2": {
        id: "4120"
    },
    "size-credit": {
        id: "4904"
    },
    "stbot": {
        id: "4909"
    },
    "zns": {
        id: "4920"
    },
    "liquid-collective": {
        id: "3391"
    },
    "juice-finance": {
        id: "4208"
    },
    "origin-dollar": {
        id: "427"
    },
    "betmode": {
        enabled: false, // has negative fees for many dates
        id: "4927"
    },
    "silo-finance": {
        id: "2020"
    },
    "cetus": {
        id: "2289"
    },
    "arrakis-v2": {
        parentId: "Arrakis Finance",
        id: "2667"
    },
    "stargate-finance-v2": {
        parentId: "Stargate Finance",
        id: "4831"
    },
    "superstate": {
        id: "4265"
    },
    "apex-omni": {
        parentId: "ApeX Protocol",
        id: "4822"
    },
    "dedust": {
        id: "2617"
    },
    "orderly": {
        "id": "2264"
    },
    "spacewhale": {
        id: "4930"
    },
    "mevx": {
        id: "4945"
    },
    "metaplex": {
        id: "4959"
    },
    "umoja": {
        id: "4963"
    },
    "goplus": {
        id: "4977"
    },
    "photon": {
        id: "4981"
    },
    "factor": {
        parentId: "Factor",
        id: "3298"
    },
    "dexscreener": {
        id: "4990"
    },
    "kamino-lending": {
        parentId: "Kamino",
        id: "3770"
    },
    "ston": {
        id: "2337"
    },
    "moonwell": {
        id: "1853"
    },
    "spiko": {
        id: "4980"
    },
    "helio": {
        id: "5007"
    },
    "sunpump": {
        parentId: "SUN.io",
        id: "4979"
    },
    "dextools": {
        id: "5006"
    },
    "manifold": {
        id: "5005"
    },
    "circle": {
        id: "5008"
    },
    "tether": {
        id: "5009"
    },
    "thegraph": {
        id: "5010"
    },
    "demented-games": {
        id: "5013"
    },
    "kyberswap-aggregator": {
        parentId: "KyberSwap",
        id: "3982",
        enabled: true
    },
    "raybot": {
        id: "5022"
    },
    "illuvium": {
        id: "447"
    },
    "4cast": {
        id: "5027"
    },
    "bellumexchange": {
        id: "5029"
    },
    "ribbon": {
        parentId: "Ribbon Finance",
        id: "281"
    },
    "velo": {
        id: "4989"
    },
    "openeden-t-bills": {
        id: "3057"
    },
    "bcraft": {
        id: "5036"
    },
    "paxos-gold": {
        id: "4862"
    },
    "chainflip": {
        id: "3853"
    },
    "franklin-templeton": {
        id: "4878"
    },
    "hashnote-usyc": {
        id: "3698"
    },
    "farcaster": {
        id: "5049"
    },
    "lista-slisbnb": {
        parentId: "Lista DAO",
        id: "3354"
    },
    "lista-lisusd": {
        parentId: "Lista DAO",
        id: "2038"
    },
    "ethervista": {
        id: "5092"
    },
    "echelon": {
        id: "4367"
    },
    "torch": {
        id: "5096"
    },
    "sunswap-v1": {
        parentId: "SUN.io",
        id: "690"
    },
    "sunswap-v2": {
        parentId: "SUN.io",
        id: "3005"
    },
    "sunswap-v3": {
        parentId: "SUN.io",
        id: "4031"
    },
    "fwx-dex": {
        parentId: "FWX",
        id: "4962"
    },
    "koi-finance-cl": {
        parentId: "Koi Finance",
        id: "4678"
    },
    "superchain": {
        id: "5111"
    },
    "gaspump": {
        id: "5094"
    },
    "zeno": {
        id: "4642"
    },
    "dhedge": {
        id: "190"
    },
    "ref-finance": {
        "id": "541"
    },
    "bmx-freestyle": {
        parentId: "BMX",
        "id": "4903"
    },
    "pear-protocol": {
        id: "5151"
    },
    "solv-finance": {
        parentId: "Solv Protocol",
        id: "4620"
    },
    "sparkdex-v3": {
        parentId: "SparkDEX",
        id: "4888"
    },
    "toros": {
        id: "1881"
    },
    "myx-finance": {
        "id": "4319"
    },
    "erinaceus": {
        id: "5183"
    },
    "moonshot-money": {
        id: "5188"
    },
    "filament": {
        id: "5650",
    },
    "bifrost-liquid-staking": {
        id: "1738"
    },
    "pocket-universe": {
        id: "5189"
    },
    "memecooking": {
        id: "5185"
    },
    "prerich-app": {
        id: "5196"
    },
    "trado": {
        id: "5208",
    },
    "ntm": {
        id: "5212",
    },
    "jeton": {
      id: "5213",
    },
    "sparkdex-v3-1": {
        parentId: "SparkDEX",
        id: "5223"
    },
    "sparkdex-v2": {
        parentId: "SparkDEX",
        id: "4887",
    },
    "arbitrum-nova": {
        id: "42170",
    },
    "kerberos": {
        id: "5233",
    },
    "safe": {
        id: "3320"
    },
    "botfalcon": {
        id: "5237"
    },
    "mint": {
        id: "185"
    },
    "grafun": {
        id: "5195"
    },
    "wise-lending-v2": {
        parentId: "Wise Lending",
        id: "4494"
    },
    "makenow-meme": {
        id: "5246"
    },
    "linehub-v3": {
        parentId: "LineHub",
        id: "4661"
    },
    "linehub-v2": {
        parentId: "LineHub",
        id: "4660"
    },
    "quickswap-hydra": {
        parentId: "QuickSwap",
        id: "5187"
    },
    "quickswap-perps": {
        parentId: "QuickSwap",
        id: "2980",
    },
    "step-finance": {
        id: "4837"
    },
    "assetchain": {
        id: "42420"
    },
    "kinetix-v2": {
        parentId: "Kinetix",
        id: "3533"
    },
    "kinetix-v3": {
        parentId: "Kinetix",
        id: "3534"
    },
    "metavault-amm-v2": {
        parentId: "MetaVault",
        id: "5186"
    },
    "surge-trade": {
        id: "5290"
    },
    "suilend": {
        id: "4274"
    },
    "juicebox": { // adapter not working
        parentId: "Juicebox",
        id: "2833"
    },
    "celestia": {
        id: "22861"
    },
    "yamfore": {
        id: "5304"
    },
    "bonzo": {
        id: "5287"
    },
    "quenta": {
        id: "5314"
    },
    "fluid-dex": {
        parentId: "Fluid",
        id: "5317"
    },
    "g8keep": {
        id: "5318"
    },
    "iziswap": {
        parentId: "iZUMI Finance",
        "id": "1883"
    },
    "dragonswap-sei-v3": {
        parentId: "Dragon Swap",
        id: "5066"
    },
    "morFi": {
        id: "5307"
    },
    "solar-studios": {
        id: "5346"
    },
    "orca": {
        "id": "283"
    },
    "stabble": {
        id: "4734"
    },
    "kamino-liquidity": {
        parentId: "Kamino",
        id: "2062"
    },
    "blazingbot": {
        id: "5377"
    },
    "goat-protocol": {
        id: "4162"
    },
    "adrena": {
        id: "5353"
    },
    "phantom": {
        id: "5398"
    },
    "bullx": {
        id: "5407"
    },
    "gmgnai": {
        id: "5408"
    },
    "debank-cloud": {
        id: "5410"
    },
    "navi": {
        id: "3323",
    },
    "hydrometer": {
        id: "5423",
    },
    "bluefin-amm": {
        id: "5427",
        parentId: "Bluefin",
    },
    "taraswap": {
        id: "5437",
    },
    "clanker": {
        id: "5446"
    },
    "bouncebit-cedefi": {
        parentId: "BounceBit CeDeFi",
        id: "5450"
    },
    "swing": {
        id: "5474"
    },
    "thetis-market": {
        parentId: "Thetis Market",
        id: "5469"
    },
    "iotex": {
        id: "4689"
    },
    "lyra-v2": {
        parentId: "Derive",
        id: "3923"
    },
    "balancer-v3": {
        parentId: "Balancer",
        id: "5491"
    },
    "memewe": {
        id: "5501"
    },
    "mars-perp": {
        parentId: "Mars Protocol",
        id: "5498",
        protocolsData: {
            "derivatives": {
                "id": "5498",
            }
        }
    },
    "neby-dex": {
        id: "5512"
    },
    "sudofinance": {
        id: "4045"
    },
    "emojicoin": {
        id: "5454"
    },
    "invariant": {
        id: "1788"
    },
    "memejob": {
        id: "5533"
    },
    "hyperliquid": {
        parentId: "Hyperliquid",
        displayName: "Hyperliquid",
        id: "5761"
    },
    "liquidity-slicing": {
        id: "5297"
    },
    "zivoe": {
        id: "5551"
    },
    "rabbitswap-v3": {
        id: "5298"
    },
    "satoshi-perps": {
        id: "5571",
    },
    "virtual-protocol": {
        id: "5575",
    },
    "trust-wallet": {
        id: "5577",
    },
    "coinbase-wallet": {
        id: "5587",
    },
    "dappos-intentEx": {
        id: "5597",
    },
    "volboost": {
        id: "5598",
    },
    "creator-bid": {
        id: "5600",
    },
    "eisen": {
        id: "4691",
    },
    "vader-ai": {
        id: "5535",
    },
    "maxapy": {
        id: "5306",
    },
    "zeebu": {
        id: "5540",
    },
    "lnexchange-perp": {
        id: "5639",
    },
    "waterneuron": {
        id: "4921",
    },
    "meteora-dlmm": {
        parentId: "Meteora",
        id: "4148",
    },
    "meteora": {
        parentId: "Meteora",
        id: "385"
    },
    "zarban": {
        id: "5636",
    },
    "vectorfun": {
        id: "5653"
    },
    "soneium": {
        id: "1868"
    },
    "ink": {
        id: "57073"
    },
    "cvex": {
        id: "5610"
    },
    "hfun": {
        id: "5671"
    },
    "tribe-run": {
        id: "5669"
    },
    "zoodotfun": {
        id: "5684"
    },
    "quill-fi": {
        id: "5685"
    },
    "liquity-v2": {
        id: "5656"
    },
    "jupiter": {
        parentId: "Jupiter",
        id: "2141"
    },
    "rabby": {
        id: "5714"
    },
    "looter": {
        id: "5728"
    },
    "flaunch": {
        id: "5715"
    },
    "jumper-exchange": {
        id: "3524"
    },
    "ocelex": {
        parentId: "Ocelex",
        id: "5379"
    },
    "levvy-fi": {
        id: "3163"
    },
    "levvy-fi-tokens": {
        id: "3618"
    },
    "bunni-v2": {
        parentId: "Timeless",
        id: "5734"
    },
    "amped": {
        id: "3833"
    },
    "vinufinance": {
        id: "5717"
    },
    "jupiter-perpetual": {
        "id": "4077",
        "protocolsData": {
            "derivatives": {
                "id": "4077",
            }
        }
    },
    "wavex": {
        id: "5737"
    },
    "berachain-hub": {
        id: "5742"
    },
    "polymarket": {
        enabled: false, // fees value is wrong
        id: "711"
    },
    "velar": {
        id: "4339"
    },
    "four-meme": {
        id: "5174"
    },
    "pulsex-v1": {
        parentId: "PulseX",
        id: "2995"
    },
    "pulsex-v2": {
        parentId: "PulseX",
        id: "3060"
    },
    "pulsex-stableswap": {
        parentId: "PulseX",
        id: "5795",
    },
    "kodiak-v2": {
        id: "5743",
    },
    "bloom": {
        id: "5806",
    },
    "flashbot": {
        id: "5809",
    },
    "silverswap": {
        id: "5529",
    },
    "ducata": {
        id: "4896",
    },
    "embr": {
        id: "1063",
    },
    "gaming-dex": {
        id: "4263",
    },
    "ginsengswap": {
        id: "5803",
    },
    "polaris-fi": {
        id: "1440",
    },
    "phux": {
        id: "3205",
    },
    "tanukix": {
        id: "5038",
    },
    "magma-finance": {
        id: "5774",
    },
    "jupiter-dca": {
        parentId: "Jupiter",
        id: "5841",
    },
    "sablier": {
        id: "199",
    },
    "goplus-locker": {
        id: "5807",
    },
    "caviarnine-simplepool": {
        id: "5064",
    },
    "hedgey": {
        id: "5846"
    },
    "steamm": {
        id: "5824"
    },
    "flexperp": {
        id: "5843"
    },
    "blast": {
        id: "81457"
    },
    "fraxtal": {
        id: "252"
    },
    "linea": {
        id: "59144"
    },
    "mantle": {
        id: "5000"
    },
    "metis": {
        id: "1088"
    },
    "mode": {
        id: "34443"
    },
    "ronin": {
        id: "2020"
    },
    "scroll": {
        id: "534352"
    },
    "sei": {
        id: "23149"
    },
    "sonic": {
        id: "146"
    },
    "unichain": {
        id: "130"
    },
    "berachain": {
        id: "80094"
    },
    "burrbear": {
        id: "5745"
    },
    "fibonacci-dex": {
        id: "5832"
    },
    "starknet": {
        id: "22691"
    },
    "sailor-finance": {
        id: "5647",
    },
    "hyperswap-v2": {
        id: "5836"
    },
    "hyperswap-v3": {
        id: "5837"
    },
    "wasabee": {
        id: "5845"
    },
    "thalaswap-v2": {
        parentId: "Thala",
        id: "5329",
    },
    "degen-launchpad": {
        id: "5857"
    },
    "tronsave": {
        id: "5864"
    },
    "erc-burner": {
        id: "5859"
    },
    "infrared-finance": {
        id: "5775"
    },
    "desk": {
        id: "5813"
    },
    "beradrome": {
        id: "5798"
    },
    "rings": {
        id: "5526"
    },
    "hyperion": {
        id: "5480"
    },
    "ton": {
        id: "11419"
    },
    "sui": {
        id: "20947"
    },
    "aptos": {
        id: "21794"
    },
    "metropolis-amm": {
        id: "5504"
    },
    "metropolis-dlmm": {
        id: "5505"
    },
    "tea-fi": {
        id: "5875"
    },
    "beethoven-x-v3": {
        id: "5680"
    },
    "trade-wiz": {
        id: "5886"
    },
    "rain": {
        id: "3903"
    },
    "SwapX-algebra": {
        id: "5579"
    },
    "SwapX-v2": {
        id: "5578"
    },
    "meridian-amm": {
        id: "5885"
    },
    "merkle-trade": {
        "id": "3678"
    },
    "gyroscope": {
        "id": "2397"
    },
    "wildcat": {
        "id": "3871"
    },
    "napier": {
        "id": "4834"
    },
    "yuzu-finance": {
        "id": "5906"
    },
    "beets-staked-sonic": {
        id: "4126"
    },
    "stout": {
        disabled: true,
        id: "5902"
    },
    "rfx": {
        id: "5406"
    },
    "stability": {
        id: "4256"
    },
    "sedge": {
        id: "5930"
    },
    "vicuna-finance": {
        id: "5672"
    },
    "eggs-finance": {
        id: "5789"
    },
    "tonco": {
        id: "5363"
    },
    "witty": {
        id: "5908"
    },
    "logx": {
        id: "5137"
    },
    "ekubo-evm": {
        id: "5914"
    },
    "contango": {
        id: "3602"
    },
    "ripple": {
        id: "52"
    },
    "equalizer-cl": {
        id: "5603"
    },
    "balanced": {
        id: "448"
    },
    "xswap-v3": {
        id: "3914"
    },
    "xswap-v2": {
        id: "2145"
    },
    "mayan": {
        id: "5925"
    },
    "unchain-x": {
        id: "5917"
    },
    "aavechan": {
        id: "5926"
    },
    "paint-swap": {
        id: "421"
    },
    "energyweb": {
        id: "246"
    },
    "finder-bot": {
        id: "5934"
    },
    "sol-trading-bot": {
        id: "4909"
    },
    "suite": {
        id: "5933"
    },
    "stakedao": {
        id: "249"
    },

    "getHemiNames": {
        id: "5929"
    },
    "apechain": {
        id: "33139"
    },
    "chiliz": {
        id: "88888"
    },
    "ethereumclassic": {
        id: "61"
    },
    "etherlink": {
        id: "42793"
    },
    "flare": {
        id: "4172"
    },
    "fuse": {
        id: "122"
    },
    "harmony": {
        id: "1666600000"
    },
    "hemi": {
        id: "43111"
    },
    "imx": {
        id: "13371"
    },
    "kardia": {
        id: "5453"
    },
    "kcc": {
        id: "321"
    },
    "kroma": {
        id: "255"
    },
    "lisk": {
        id: "1135"
    },
    "nuls": {
        id: "2092"
    },
    "oasys": {
        id: "16116"
    },
    "redstone": {
        id: "690"
    },
    "rootstock": {
        id: "30"
    },
    "shimmer_evm": {
        id: "148"
    },
    "story": {
        id: "1514"
    },
    "syscoin": {
        id: "57"
    },
    "telos": {
        id: "40"
    },
    "thundercore": {
        id: "108"
    },
    "velas": {
        id: "106"
    },
    "zeta": {
        id: "7000"
    },
    "archerswap": {
        id: "2648"
    },
    "superposition": {
        id: "55244"
    },
    "gacha": {
        id: "5942"
    },
    "pump-swap": {
        id: "5936"
    },
    "agdex": {
        id: "5467"
    },
    "ancient8": {
        id: "888888888"
    },
    "bob": {
        id: "60808"
    },
    "corn": {
        id: "21000000"
    },
    "gravity": {
        id: "1625"
    },
    "iota_evm": {
        id: "8822"
    },
    "lightlink": {
        id: "1890"
    },
    "reya": {
        id: "1729"
    },
    "swellchain": {
        id: "1923"
    },
    "worldchain": {
        id: "480"
    },
    "hop-protocol": {
        id: "435"
    },
    "squadswap-dynamo": {
        id: "5921"
    },
    "squadswap-wow": {
        id: "5922"
    },
    "magnum-trading-bot": {
        id: "5945"
    },
    "canto-lending": {
        id: "1986"
    },
    "deepr-finance": {
        id: "4015"
    },
    "elara": {
        id: "5390"
    },
    "fluxfinance": {
        id: "2537"
    },
    "hover": {
        id: "3822"
    },
    "ironbank": {
        id: "1303"
    },
    "machfi": {
        id: "5573"
    },
    "mendi-finance": {
        id: "3421"
    },
    "strike": {
        id: "589"
    },
    "sumer": {
        id: "3814"
    },
    "traderjoe-lend": {
        id: "2179"
    },
    "vaultcraft": {
        id: "1791"
    },
    "dextoro": {
        id: "5954"
    },
    "move": {
        id: "3073"
    },
    "snakefinance": {
        id: "5760"
    },
    "baker-dao": {
        id: "5964"
    },
    "hedera": {
        id: "295"
    },
    "pinksale": {
        id: "1807"
    },
    "katana": {
        id: "797"
    },
    "saucerswap": {
        id: "1979"
    },
    "saucerswap-v2": {
        id: "5966"
    },
    "syncswap": {
        id: "2728"
    },
    "filecoin": {
        id: "314"
    },
    "paycash": {
        id: "1452"
    },
    "paradex": {
        id: "3648"
    },
    "tornado": {
        id: "148"
    },
    "karak": {
        id: "2410" // chainId
    },
    "saber": {
        id: "419"
    },
    "justbet": {
        id:"5950"
    },
    "katana-v3": {
        id: "5972"
    },
    "privacy-pools": {
        id: "5977"
    },
    "syncswap-v3": {
        id: "5982"
    },
    "oxfun": {
        id: "6699" // chainId
    },
    "verus": {
        id: "5601" 
    },
    "haedal": {
        id: "5784"
    },
    "haedal-vault": {
        id: "5967"
    },
    "equilibria": {
        id: "3091"
    },
    "arweave": {
        id: "35386" // cmcId
    },
    "usdx": {
        id: "5234"
    },
    "rocketpool": {
        id: "900"
    },
    "winr": {
        id: "777777" // chainId
    },
    "sofa-org": {
        id: "4779"
    },
    "edgex": {
        id: "4954"
    },
    "royco": {
        id: "5337"
    },
    "dolomite": {
        id: "2187"
    },
    "stader": {
        id: "1044"
    },
    "cian-yieldlayer": {
        id: "5376"
    },
    "beraborrow": {
        id: "5746"
    },
    "apestore": {
        id: "4584"
    },
    "euler": { // euler v2
        id: "5044"
    },
    "hardswap": {
        id: "5999"
    },
    "spark": {
        id: "2929"
    },
    "hypurrfi": {
        id: "5838"
    },
    "stakestone-stone": {
        id: "3558"
    },
    "resupply": {
        id: "5963"
    },
    "momentum": {
        id: "6005"
    },
    "sonex": {
        id: "5640"
    },
    "kyo-fi-v3": {
        id: "5622"
    },
    "hashkey": {
        id: "177" // chainId
    },
    "polynomial": {
        id: "8008" // chainId
    },
    "veda": {
        id: "5825"
    },
    "felix": {
        id: "6015"
    },
    "zo": {
        id: "6018"
    },
    "liquidloans-io": {
        id: "4043"
    },
    "powercity-earn-protocols": {
        id: "4376"
    },
    "powercity-flex-protocols": {
        id: "4881"
    },
    "sable-finance": {
        id: "3355"
    },
    "teddy-cash": {
        id: "535"
    },
    "threshold-thusd": {
        id: "4812"
    },
    "jellyverse": {
        id: "4772",
        protocolsData: {
            "v2": {
                id: "4772"
            }
        }
    },
    "usual": {
        id: "4882"
    },
    "ondo": {
        id: "2542"
    },
    "traderjoe-lb-v2-2": {
        id: "4794"
    },
    "kongswap": {
        id: "5528"
    },
    "alpacafinance-gmx": {
        id: "2658"
    },
    "phame-protocol": {
        id: "3569"
    },
    "sobax-io": {
        id: "4143"
    },
    "tsunami-fi": {
        id: "2979"
    },
    "kinetix-v1": {
        id: "3465"
    },
    "axiom": {
        id: "6049"
    },
    "mellow-lrt": {
        id: "4756"
    },
    "liquid-ron": {
        id: "6020"
    },
} as AdaptorsConfig
