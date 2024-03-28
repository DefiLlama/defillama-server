import { AdaptorsConfig } from "../types"

export default {
    "aave": {
        "enabled": true,
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
                enabled: true,
            },
            v3: {
                "id": "1599",
                enabled: true,
            }
        }
    },
    "angle": {
        "enabled": true,
        "id": "756"
    },
    "balancer": {
        "enabled": true,
        "id": "116",
        parentId: "Balancer",
        protocolsData: {
            v1: {
                id: "116",
                enabled: true,
                displayName: "Balancer V1"
            },
            v2: {
                id: "2611",
                enabled: true,
                displayName: "Balancer V2"
            }
        }
    },
    "biswap": {
        parentId: "BiSwap",
        "enabled": true,
        "id": "373"
    },
    "bitcoin": {
        "enabled": true,
        "id": "1",
        "isChain": true
    },
    "bsc": {
        "enabled": true,
        "id": "1839"
    },
    "compound": {
        parentId: "Compound Finance",
        "enabled": true,
        "id": "114"
    },
    "convex": {
        "enabled": true,
        "id": "319"
    },
    "curve": {
        "enabled": true,
        "id": "3"
    },
    "doge": {
        "enabled": true,
        "id": "74"
    },
    "ethereum": {
        "enabled": true,
        "id": "1027"
    },
    "frax-swap": {
        parentId: "Frax Finance",
        "enabled": true,
        "id": "2121"
    },
    "gmx": {
        "enabled": true,
        "id": "337",
        parentId: "GMX",
        protocolsData: {
            "swap": {
                "id": "337",
                "enabled": true,
                "category": "Dexes",
                "displayName": "GMX - SWAP"
            },
            "derivatives": {
                displayName: "GMX - Derivatives",
                "id": "337",
                "enabled": true
            }
        },
    },
    "lido": {
        "enabled": true,
        "id": "182"
    },
    "litecoin": {
        "enabled": true,
        "id": "2"
    },
    "looksrare": {
        "enabled": true,
        "id": "1229"
    },
    "makerdao": {
        "enabled": true,
        "id": "118"
    },
    "mooniswap": {
        "enabled": true,
        "id": "1053"
    },
    "opensea": {
        "enabled": true,
        "id": "2258",
        parentId: "OpenSea",
        protocolsData: {
            v1: {
                "id": "2630",
                enabled: true,
                disabled: true,
                displayName: "Opensea V1"
            },
            v2: {
                "id": "2631",
                disabled: true,
                enabled: true,
                displayName: "Opensea V2"
            },
            seaport: {
                "id": "2258",
                enabled: true,
                displayName: "Opensea Seaport"
            }
        }
    },
    "osmosis": {
        "enabled": true,
        "id": "383"
    },
    "pancakeswap": {
        parentId: "PancakeSwap",
        protocolsData: {
            v1: {
                "disabled": true,
                enabled: true,
                "id": "2590"
            },
            v2: {
                enabled: true,
                "id": "194"
            },
            stableswap: {
                "enabled": true,
                "id": "2529"
            },
            v3: {
                "enabled": true,
                "id": "2769"
            }
        },
        "enabled": true,
        "id": "194"
    },
    "pangolin": {
        "enabled": true,
        "id": "246"
    },
    "quickswap": {
        "enabled": true,
        "id": "306",
        parentId: "Quickswap",
        protocolsData: {
            v2: {
                id: "306",
                enabled: true,
                displayName: "Quickswap V2"
            },
            v3: {
                id: "2239",
                enabled: true,
            }
        }
    },
    "raydium": {
        "enabled": true,
        "id": "214"
    },
    "spookyswap": {
        "enabled": true,
        "id": "302"
    },
    "sushiswap": {
        "enabled": true,
        "id": "119",
        parentId: "Sushi",
        protocolsData: {
            classic: {
                id: "119",
                enabled: true,
            },
            trident: {
                id: "2152",
                enabled: true,
            },
            v3: {
                enabled: true,
                id: "2776"
            }
        }
    },
    "synthetix": {
        "enabled": true,
        "id": "115"
    },
    "tarot": {
        "enabled": true,
        "id": "434"
    },
    "traderjoe": {
        "enabled": true,
        "id": "468",
        parentId: "Trader Joe",
        protocolsData: {
            v1: {
                id: "468",
                enabled: true,
            },
            v2: {
                id: "2393",
                enabled: true,
            }
        }
    },
    "uniswap": {
        "enabled": true,
        "id": "1",
        parentId: "Uniswap",
        "protocolsData": {
            "v1": {
                "enabled": true,
                "id": "2196"
            },
            "v2": {
                "enabled": true,
                "id": "2197"
            },
            "v3": {
                "enabled": true,
                "id": "2198"
            },
        },
    },
    "velodrome": {
        parentId: "Velodrome",
        "enabled": true,
        "id": "1799"
    },
    "wombat-exchange": {
        "enabled": true,
        "id": "1700"
    },
    "woofi": {
        parentId: "WOOFi",
        "enabled": true,
        "id": "1461"
    },
    "metavault.trade": {
        parentId: "MetaVault",
        "enabled": true,
        "id": "1801"
    },
    "aurora": {
        "enabled": true,
        "id": "14803"
    },
    "celo": {
        "enabled": true,
        "id": "5567"
    },
    "optimism": {
        "category": "Rollup",
        "enabled": true,
        "id": "11840"
    },
    "moonbeam": {
        "enabled": true,
        "id": "6836"
    },
    "moonriver": {
        "enabled": true,
        "id": "9285"
    },
    "tron": {
        "enabled": true,
        "id": "1958"
    },
    "arbitrum": {
        "category": "Rollup",
        "enabled": true,
        "startFrom": 1660608000,
        "id": "42161"
    },
    "avalanche": {
        "enabled": true,
        "id": "5805"
    },
    "canto": {
        "enabled": true,
        "id": "21516"
    },
    "cardano": {
        "enabled": false,
        "id": "2010"
    },
    "cronos": {
        "enabled": true,
        "id": "3635"
    },
    "klaytn": {
        "enabled": false,
        "id": "4256"
    },
    "dodo": {
        "enabled": true,
        "id": "146"
    },
    "fantom": {
        "enabled": true,
        "id": "3513"
    },
    "mixin": {
        "enabled": false,
        "id": "2349"
    },
    "polygon": {
        "enabled": true,
        "id": "3890"
    },
    "solana": {
        "enabled": true,
        "id": "5426"
    },
    "xdai": {
        "enabled": true,
        "id": "1659"
    },
    "abracadabra": {
        "enabled": true,
        "id": "347"
    },
    "liquity": {
        "enabled": true,
        "id": "270"
    },
    "geist-finance": {
        disabled: true,
        "enabled": true,
        "id": "643"
    },
    "boba": {
        "enabled": false,
        "id": "14556"
    },
    "mojitoswap": {
        "enabled": true,
        "id": "1181"
    },
    "mimo": {
        "enabled": true,
        "id": "1241"
    },
    "junoswap": {
        disabled: true,
        "enabled": true,
        "id": "2052"
    },
    "honeyswap": {
        "enabled": true,
        "id": "271"
    },
    "solarbeam": {
        "enabled": true,
        "id": "551"
    },
    "spiritswap": {
        parentId: "SpiritSwap",
        "enabled": true,
        "id": "311"
    },
    "apeswap": {
        parentId: "ApeSwap",
        "enabled": true,
        "id": "398"
    },
    "nomiswap": {
        "enabled": true,
        "id": "1823"
    },
    "stellaswap": {
        "enabled": true,
        "id": "1274"
    },
    "lifinity": {
        "enabled": true,
        "id": "2154"
    },
    "shibaswap": {
        "enabled": true,
        "id": "397"
    },
    "perp88": {
        "enabled": true,
        "id": "2296"
    },
    "mux": {
        "name": "MUX Protocol",
        "enabled": true,
        "id": "2254"
    },
    "emdx": {
        "enabled": true,
        "id": "2299"
    },
    "defi-swap": {
        "enabled": true,
        "id": "221"
    },
    "babydogeswap": {
        "enabled": true,
        "id": "2169"
    },
    "stargate": {
        "enabled": true,
        "id": "1571"
    },
    "mm-stableswap-polygon": {
        parentId: "MM Finance",
        "enabled": true,
        "id": "2015"
    },
    "elk": {
        "enabled": true,
        "id": "420"
    },
    "lyra": {
        "enabled": true,
        "id": "503"
    },
    "radioshack": {
        "enabled": true,
        "id": "1616"
    },
    "valas-finance": {
        disabled: true,
        "enabled": true,
        "id": "1584"
    },
    "gains-network": {
        "enabled": true,
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
        "enabled": true,
        "id": "2290"
    },
    "moonwell-artemis": {
        "enabled": false,
        "id": "1853"
    },
    "moonwell-apollo": {
        "enabled": true,
        "id": "1401"
    },
    "kperp-exchange": {
        "disabled": true,
        "enabled": true,
        "id": "2326"
    },
    "premia": {
        "enabled": true,
        "id": "381",
        parentId: "Premia",
        protocolsData: {
            v2: {
                id: "381",
                enabled: true,
            },
            v3: {
                id: "3497",
                enabled: true,
            }
        }
    },
    "kyberswap": {
        "enabled": true,
        "id": "127",
        parentId: "KyberSwap",
        protocolsData: {
            classic: {
                id: "127",
                enabled: true,
                displayName: "KyberSwap - Classic"
            },
            elastic: {
                id: "2615",
                enabled: true,
                displayName: "KyberSwap - Elastic"
            }
        }
    },
    "llamalend": {
        "enabled": true,
        "id": "2252"
    },
    "0vix": {
        disabled: true,
        "enabled": true,
        "id": "1614"
    },
    "mummy-finance": {
        "enabled": true,
        "id": "2361"
    },
    "bluemove": {
        "enabled": true,
        "id": "2396"
    },
    "hegic": {
        "enabled": true,
        "id": "128"
    },
    "el-dorado-exchange": {
        parentId: "EDE",
        "enabled": true,
        "id": "2356"
    },
    "gearbox": {
        "enabled": true,
        "id": "1108"
    },
    "predy-finance": {
        "enabled": true,
        "id": "1657",
        parentId: "Predy Finance",
        protocolsData: {
            "v320": {
                id: "1657",
                enabled: true,
                disabled: true
            },
            "v5": {
                id: "3324",
                enabled: true
            }
        }
    },
    "verse": {
        "enabled": true,
        "id": "1732"
    },
    "level-finance": {
        "enabled": true,
        "id": "2395"
    },
    "blur": {
        "enabled": true,
        "id": "2414"
    },
    "solidlydex": {
        "enabled": true,
        "id": "2400"
    },
    "archly-finance": {
        "enabled": true,
        "id": "2317"
    },
    "stride": {
        "enabled": true,
        "id": "2251"
    },
    "plenty": {
        "enabled": true,
        "id": "490"
    },
    "firebird-finance": {
        "enabled": true,
        "id": "384"
    },
    "x2y2": {
        "enabled": true,
        "id": "1431"
    },
    "buffer": {
        "enabled": true,
        "id": "1304"
    },
    "betswirl": {
        "enabled": true,
        "id": "1911"
    },
    "zonic": {
        "enabled": true,
        "id": "2532"
    },
    "covo-finance": {
        parentId: "Covo Finance",
        "enabled": false,
        "id": "2525"
    },
    "nftearth": {
        "enabled": true,
        "id": "2546"
    },
    "liquid-bolt": {
        "enabled": true,
        "id": "2513"
    },
    "frax-ether": {
        parentId: "Frax Finance",
        enabled: true,
        "id": "2221"
    },
    "frax-fpi": {
        parentId: "Frax Finance",
        enabled: true,
        id: "2607"
    },
    "zora": {
        enabled: true,
        id: "2610"
    },
    "solidlizard": {
        enabled: true,
        id: "2528"
    },
    "zyberswap": {
        enabled: true,
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
        enabled: true,
        id: "2643"
    },
    "maverick": {
        enabled: true,
        id: "2644"
    },
    "equalizer-exchange": {
        parentId: "Equalizer",
        enabled: true,
        id: "2332"
    },
    "camelot": {
        parentId: "Camelot",
        enabled: true,
        id: "2307"
    },
    "thena": {
        name: "Thena V1",
        displayName: "Thena V1",
        enabled: true,
        id: "2417"
    },
    "paraswap": {
        enabled: true,
        id: "894",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1684800000": true
            },
        }
    },
    "ramses-exchange": {
        parentId: "Ramses Exchange",
        enabled: false,
        id: "2675"
    },
    "blastapi": {
        enabled: true,
        id: "2734"
    },
    "get-protocol": {
        enabled: true,
        id: "2735"
    },
    "radiant": {
        enabled: true,
        id: "2706"
    },
    "chainlink-vrf-v1": {
        parentId: "Chainlink",
        enabled: true,
        displayName: "Chainlink VRF V1",
        id: "3339"
    },
    "chainlink-vrf-v2": {
        parentId: "Chainlink",
        enabled: true,
        displayName: "Chainlink VRF V2",
        id: "3340"
    },
    "chainlink-keepers": {
        parentId: "Chainlink",
        enabled: true,
        displayName: "Chainlink Keepers",
        id: "3338"
    },
    "chainlink-requests": {
        parentId: "Chainlink",
        enabled: true,
        displayName: "Chainlink Requests",
        id: "2623"
    },
    "aura": {
        enabled: true,
        id: "1918"
    },
    "synapse": {
        enabled: true,
        id: "657"
    },
    "plexus": {
        enabled: true,
        id: "2740"
    },
    "vela": {
        enabled: true,
        id: "2548"
    },
    "equilibre-exchange": {
        enabled: true,
        id: "2586"
    },
    "waves": {
        enabled: true,
        id: "1274",
        isChain: true
    },
    "maia-v3": {
        "enabled": true,
        "id": "2760"
    },
    "morphex": {
        parentId: "Morphex",
        "enabled": true,
        "id": "2662"
    },
    "kyotoswap": {
        "enabled": true,
        "id": "2350"
    },
    "sonne-finance": {
        "enabled": true,
        "id": "2142"
    },
    "SmarDex": {
        "enabled": true,
        "id": "2695"
    },
    "ens": {
        "enabled": true,
        "id": "2519"
    },
    "azuro": {
        "enabled": true,
        "id": "1892"
    },
    "covo-v2": {
        "enabled": true,
        "id": "2730",
        parentId: "Covo Finance",
        cleanRecordsConfig: {
            genuineSpikes: true
        }
    },
    "camelot-v3": {
        parentId: "Camelot",
        "enabled": true,
        "id": "2792"
    },
    "auragi": {
        "enabled": true,
        "id": "2773"
    },
    "vesta-finance": {
        "enabled": true,
        "id": "1444"
    },
    "thena-v3": {
        parentId: "Thena",
        "enabled": true,
        "id": "2864"
    },
    "merlin": {
        disabled: true,
        "enabled": true,
        "id": "2849"
    },
    "hydradex": {
        "enabled": true,
        "id": "1673",
        protocolsData: {
            v2: {
                disabled: true,
                "enabled": true,
                "id": "1673",
                displayName: "Hydradex V2"
            },
            v3: {
                "enabled": true,
                "id": "2910",
                displayName: "Hydradex V3"
            }
        }
    },
    "smbswap": {
        "enabled": true,
        parentId: "SMBSwap",
        id: "1632",
        protocolsData: {
            v2: {
                enabled: true,
                "id": "1632"
            },
            v3: {
                "enabled": true,
                "id": "2895"
            }
        },
    },
    "pika-protocol": {
        parentId: "Pika Protocol",
        "enabled": true,
        "id": "916"
    },
    "chronos": {
        "enabled": true,
        "id": "2907"
    },
    "unidex": {
        "enabled": true,
        "id": "1833"
    },
    "joe-v2.1": {
        parentId: "Trader Joe",
        "enabled": true,
        "id": "2906"
    },
    "e3": {
        "enabled": true,
        "id": "2926"
    },
    "airswap": {
        "enabled": true,
        "id": "2954"
    },
    "ArbitrumExchange": {
        "enabled": true,
        "id": "2685",
        protocolsData: {
            v2: {
                "enabled": true,
                "id": "2685",
                displayName: "Arbitrum Exchange V2"
            },
            v3: {
                "enabled": true,
                "id": "2962",
                displayName: "Arbitrum Exchange V3"
            }
        }
    },
    "across": {
        "enabled": true,
        "id": "1207"
    },
    "gnd-protocol": {
        "enabled": true,
        "id": "2968"
    },
    "kwenta": {
        disabled: true,
        "enabled": true,
        "id": "2981"
    },
    "gamma": {
        "enabled": true,
        "id": "355"
    },
    "fulcrom-finance": {
        "enabled": true,
        "id": "2641"
    },
    "veax": {
        "enabled": false,
        "id": "2928"
    },
    "maestro": {
        "enabled": true,
        "id": "3019"
    },
    "forge": {
        "enabled": true,
        "id": "2804"
    },
    "metamask": {
        "enabled": true,
        "id": "3031"
    },
    "rainbow-wallet": {
        "enabled": true,
        "id": "3038"
    },
    "lybra-finance": {
        parentId: "Lybra Finance",
        "enabled": true,
        "id": "2904"
    },
    "houdini-swap": {
        "enabled": true,
        "id": "3041"
    },
    "unlimited-network": {
        "enabled": true,
        "id": "3055"
    },
    "cryptex-v2": {
        parentId: "Cryptex Finance",
        "enabled": true,
        "id": "3051"
    },
    "usdo": {
        "enabled": true,
        "id": "3098"
    },
    "unibot": {
        "enabled": true,
        "id": "3106"
    },
    "ramses-exchange-v2": {
        parentId: "Ramses Exchange",
        enabled: true,
        id: "3096"
    },
    "abcdefx": {
        enabled: true,
        id: "2376"
    },
    "liondex": {
        disabled: true,
        enabled: true,
        id: "2898"
    },
    "stealcam": {
        enabled: true,
        id: "3123"
    },
    "pearlfi": {
        enabled: true,
        id: "3121"
    },
    "scatter": {
        enabled: true,
        id: "3146"
    },
    "alchemix": {
        enabled: true,
        id: "204"
    },
    "doveswap": {
        "enabled": true,
        "id": "2763",
        parentId: "Dove Swap",
        "protocolsData": {
            "v3": {
                "id": "2809",
                "enabled": true,
            }
        },
    },
    "foundation": {
        enabled: true,
        id: "3168"
    },
    "thalaswap": {
        parentId: "Thala Labs",
        enabled: true,
        id: "2795"
    },
    "y2k": {
        parentId: "Y2K Finance",
        enabled: true,
        id: "2375",
        "protocolsData": {
            "v1": {
                "id": "2375",
                "enabled": true,
            },
            "v2": {
                "id": "3056",
                "enabled": true,
            }
        },
    },
    "yield-yak-staked-avax": {
        enabled: true,
        id: "475"
    },
    "voodoo-trade": {
        enabled: true,
        id: "3792"
    },
    "equity": {
        parentId: "Equalizer",
        enabled: true,
        id: "3173"
    },
    "pendle": {
        enabled: true,
        id: "382"
    },
    "move-dollar": {
        parentId: "Thala Labs",
        enabled: true,
        id: "2789"
    },
    "pinnako": {
        enabled: true,
        id: "3209"
    },
    "DerpDEX": {
        enabled: true,
        id: "3234"
    },
    "wigoswap": {
        "enabled": true,
        "id": "1351"
    },
    "apollox": {
        "enabled": true,
        "id": "1772"
    },
    "concordex-io": {
        "enabled": false,
        "id": "3172"
    },
    "vvs-finance": {
        "enabled": true,
        "id": "831"
    },
    "agni-fi": {
        "enabled": true,
        "id": "3265"
    },
    "benqi-lending": {
        parentId: "Benqi",
        "enabled": true,
        "id": "467"
    },
    "pika-protocol-v4": {
        parentId: "Pika Protocol",
        "enabled": true,
        "id": "3281"
    },
    "holdstation-defutures": {
        "enabled": true,
        "id": "2959"
    },
    "unicrypt": {
        parentId: "UniCrypt",
        "enabled": true,
        "id": "1765"
    },
    "0x0dex": {
        "enabled": true,
        "id": "3264"
    },
    "base": {
        "category": "Rollup",
        "enabled": true,
        "id": "8453"
    },
    "velodrome-v2": {
        parentId: "Velodrome",
        "enabled": true,
        "id": "3302"
    },
    "sobal": {
        "enabled": true,
        "id": "3246"
    },
    "reserve": {
        "enabled": true,
        "id": "626"
    },
    "grizzly-trade": {
        disabled: true,
        "enabled": true,
        "id": "3301"
    },
    "rollup-finace": {
        "enabled": true,
        "id": "2889"
    },
    "ktx": {
        "enabled": true,
        "id": "3025"
    },
    "zunami": {
        disabled: true,
        "enabled": true,
        "id": "1201"
    },
    "fusionx-v3": {
        parentId: "FusionX Finance",
        enabled: true,
        id: "3239"
    },
    "ferro": {
        "enabled": true,
        "id": "1882"
    },
    "satori": {
        "enabled": true,
        "id": "2982"
    },
    "fcon-dex": {
        disabled: true,
        "enabled": true,
        "id": "3299"
    },
    "friend-tech": {
        "enabled": true,
        "id": "3377"
    },
    "fusionx-v2": {
        parentId: "FusionX Finance",
        enabled: true,
        id: "3238"
    },
    "vertex-protocol": {
        "enabled": true,
        "id": "2899"
    },
    "edebase": {
        parentId: "EDE",
        "enabled": true,
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
        "enabled": true,
        "id": "3345"
    },
    "banana-gun-trading": {
        "enabled": true,
        "id": "3336"
    },
    "lynex": {
        "enabled": true,
        "id": "3408"
    },
    "op-bnb": {
        "enabled": true,
        "id": "204",
        "isChain": true
    },
    "meowl": {
        "enabled": true,
        "id": "3418"
    },
    "qidao": {
        "enabled": true,
        "id": "449"
    },
    "zksync-era": {
        "category": "Rollup",
        "enabled": true,
        "id": "324"
    },
    "meridian-trade": {
        "enabled": false,
        "id": "3386"
    },
    "baseswap": {
        "enabled": true,
        "id": "3333",
        parentId: "BaseSwap",
        "protocolsData": {
            "v2": {
                "id": "3333",
                "enabled": true,
            },
            "v3": {
                "id": "3507",
                "enabled": true,
            }
        }
    },
    "yfx-v3": {
        "enabled": true,
        "id": "3429"
    },
    "gmx-v2": {
        parentId: "GMX",
        "enabled": true,
        "id": "3365"
    },
    "swapbased": {
        parentId: "SwapBased",
        "enabled": true,
        "id": "3328",
        protocolsData: {
            "v2": {
                "id": "3328",
                "enabled": true,
            }
        },
    },
    "danogo": {
        "enabled": true,
        "id": "3454"
    },
    "sharesgram": {
        "enabled": false,
        "id": "3464"
    },
    "tigris": {
        "enabled": false,
        "id": "3129"
    },
    "aerodrome": {
        "enabled": true,
        "id": "3450"
    },
    "apex": {
        "enabled": true,
        "id": "1878"
    },
    "lybra-v2": {
        parentId: "Lybra Finance",
        "enabled": true,
        "id": "3468"
    },
    "morphex-old": {
        parentId: "Morphex",
        "enabled": true,
        "id": "3483"
    },
    "pact": {
        "enabled": true,
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
        "enabled": true,
        "id": "3515",
    },
    "basepaint": {
        "enabled": true,
        "id": "3519"
    },
    "monarchpay": {
        "enabled": true,
        "id": "3520"
    },
    "perpetual-protocol": {
        "enabled": true,
        "id": "362"
    },
    "nether-fi": {
        "enabled": true,
        "id": "3509"
    },
    "extra": {
        "enabled": true,
        "id": "2974"
    },
    "blazebot": {
        "enabled": true,
        "id": "3527"
    },
    "stakewise": {
        "enabled": true,
        "id": "277"
    },
    "bmx": {
        parentId: "Morphex",
        "enabled": true,
        "id": "3530"
    },
    "mango-v4": {
        parentId: "Mango Markets",
        "enabled": true,
        "id": "3174"
    },
    "hono": {
        "enabled": true,
        "id": "3532"
    },
    "thena-perp": {
        parentId: "Thena",
        "enabled": true,
        "id": "3537",
    },
    "post-tech": {
        "enabled": true,
        "id": "3535",
    },
    "ekubo": {
        "enabled": true,
        "id": "3499"
    },
    "tangible-rwa": {
        parentId: "Tangible",
        "enabled": true,
        "id": "2231"
    },
    "caviar-tangible": {
        parentId: "Tangible",
        "enabled": true,
        "id": "3528"
    },
    "solidly-v3": {
        parentId: "Solidly Labs",
        "enabled": true,
        "id": "3481"
    },
    "friend3": {
        "enabled": true,
        "id": "3566"
    },
    "Scale": {
        parentId: "Equalizer",
        "enabled": true,
        "id": "3575"
    },
    "stars-arena": {
        "enabled": true,
        "id": "3564"
    },
    "based-markets": {
        "enabled": true,
        "id": "3609"
    },
    "allbridge-core": {
        "enabled": true,
        "id": "3944"
    },
    "cipher": {
        "enabled": true,
        "id": "3563"
    },
    "blex": {
        "enabled": true,
        "id": "3605"
    },
    "sudoswap-v1": {
        parentId: "Sudoswap",
        "enabled": true,
        "id": "1917"
    },
    "sudoswap-v2": {
        parentId: "Sudoswap",
        "enabled": true,
        "id": "3095"
    },
    "xena-finance": {
        "enabled": true,
        "id": "3620"
    },
    "gambit": {
        "enabled": true,
        "id": "3325"
    },
    "tangleswap": {
        "enabled": true,
        "id": "3585"
    },
    "uniswap-lab": {
        "enabled": true,
        "id": "3657"
    },
    "shimmersea": {
        "enabled": true,
        "id": "3571"
    },
    "vapordex": {
        "enabled": true,
        "id": "2342",
        protocolsData: {
            v2: {
                "id": "3654",
                enabled: true,
            }
        }
    },
    "chainlink-ccip": {
        parentId: "Chainlink",
        "enabled": true,
        "id": "3675"
    },
    "crv-usd": {
        parentId: "Curve Finance",
        "enabled": true,
        "id": "2994"
    },
    "shuriken": {
        "enabled": true,
        "id": "3687"
    },
    "clipper": {
        "enabled": true,
        "id": "622"
    },
    "morpho-compound": {
        parentId: "Morpho",
        "enabled": false,
        "id": "1997"
    },
    "benqi-staked-avax": {
        parentId: "Benqi",
        "enabled": true,
        "id": "1427"
    },
    "prisma-finance": {
        "enabled": true,
        "id": "3473"
    },
    "impermax-finance": {
        "enabled": true,
        "id": "343"
    },
    "defi-saver": {
        "enabled": true,
        "id": "177"
    },
    "zapper-channels": {
        "enabled": true,
        "id": "3703"
    },
    "valorem": {
        "enabled": true,
        "id": "3501"
    },
    "clever": {
        "enabled": true,
        "id": "1707"
    },
    "concentrator": {
        "enabled": true,
        "id": "1544"
    },
    "touch.fan": {
        "enabled": true,
        "id": "3713"
    },
    "paal-ai": {
        "enabled": true,
        "id": "3723"
    },
    "kinetix": {
        parentId: "Kinetix",
        "enabled": true,
        "id": "3534"
    },
    "retro": {
        "enabled": true,
        "id": "3311"
    },
    "hipo": {
        "enabled": true,
        "id": "3722"
    },
    "intent-x": {
        "enabled": true,
        "id": "3747"
    },
    "caviarnine-lsu-pool": {
        parentId: "CaviarNine",
        "enabled": true,
        "id": "3666"
    },
    "caviarnine-shape-liquidity": {
        "enabled": true,
        "id": "3645"
    },
    "metavault-v3": {
        parentId: "Metavault",
        "enabled": true,
        "id": "3750",
        protocolsData: {
            "v3": {
                "id": "3750",
                "enabled": true,
            }
        }
    },
    "xoxno": {
        "enabled": true,
        "id": "3753"
    },
    "equation": {
        parentId: "Equation",
        "enabled": true,
        "id": "3726"
    },
    "hopr": {
        "enabled": true,
        "id": "3761"
    },
    "solend": {
        "enabled": true,
        "id": "458"
    },
    "thorswap": {
        "enabled": true,
        "id": "412"
    },
    "amphor": {
        "enabled": true,
        "id": "3643"
    },
    "dydx": {
        "id": "144",
        "enabled": true
    },
    "justlend": {
        "enabled": true,
        "id": "494"
    },
    "wagmi": {
        "enabled": true,
        "id": "2837"
    },
    "chimpexchange": {
        "enabled": true,
        "id": "3836"
    },
    "dln": {
        "enabled": true,
        "id": "3846"
    },
    "near": {
        "enabled": true,
        "id": "6535"
    },
    "substanceX": {
        "enabled": true,
        "id": "3835"
    },
    "up-vs-down-game": {
        "enabled": true,
        "id": "3872"
    },
    "aimbot": {
        "enabled": true,
        "id": "3875"
    },
    "sns": {
        "enabled": true,
        "id": "3877"
    },
    "thick": {
        "enabled": true,
        "id": "3878"
    },
    "noah-swap": {
        "enabled": true,
        "id": "2855"
    },
    "stormtrade": {
        "enabled": true,
        "id": "3883"
    },
    "beethoven-x": {
        parentId: "Beethoven X",
        "enabled": true,
        "id": "654"
    },
    "ascent-v2": {
        parentId: "Ascent Exchange",
        "enabled": true,
        "id": "3867"
    },
    "ascent-v3": {
        parentId: "Ascent Exchange",
        "enabled": true,
        "id": "3868"
    },
    "xfai": {
        "enabled": true,
        "id": "3816"
    },
    "defiplaza": {
        "enabled": true,
        "id": "728"
    },
    "butterxyz": {
        "enabled": true,
        "id": "3918"
    },
    "pharaoh-exchange": {
        "enabled": true,
        "id": "3921"
    },
    "metavault-derivatives-v2": {
        parentId: "Metavault",
        "enabled": true,
        "id": "3911"
    },
    "dopex": {
        parentId: "Dopex",
        "enabled": true,
        "id": "3817",
        protocolsData: {
            "clamm": {
                "id": "3817",
                "enabled": true,
            }
        }
    },
    "bluefin": {
        "enabled": true,
        "id": "2625"
    },
    "odos": {
        "enabled": true,
        "id": "3951"
    },
    "dexter": {
        enabled: true,
        id: "2737"
    },
    "fvm-exchange": {
        parentId: "Velocimeter",
        "enabled": true,
        "id": "3291"
    },
    "kiloex": {
        "enabled": true,
        "id": "3329"
    },
    "railgun": {
        "enabled": true,
        "id": "1320"
    },
    "surfone": {
        "enabled": true,
        "id": "3954"
    },
    "squa-defi": {
        "enabled": true,
        "id": "3977"
    },
    "beamex": {
        "enabled": true,
        parentId: "BeamSwap",
        "id": "3251"
    },
    "beamswap-v3": {
        parentId: "BeamSwap",
        "enabled": true,
        "id": "3092",
        protocolsData: {
            "v3": {
                "id": "3092",
                "enabled": true,
            }
        }
    },
    "beamswap": {
        parentId: "BeamSwap",
        "enabled": true,
        "id": "1289"
    },
    "shoebillFinance-v2": {
        parentId: "Shoebill Finance",
        "enabled": true,
        "id": "3548"
    },
    "pepe-swaves": {
        parentId: "PepeTeam",
        "enabled": true,
        "id": "2351"
    },
    "maple-finance": {
        parentId: "Maple Finance",
        "enabled": true,
        "id": "587"
    },
    "jibswap": {
        "enabled": true,
        "id": "3928"
    },
    "cleopatra-exchange": {
        "enabled": true,
        "id": "3985"
    },
    "immortalx": {
        "enabled": true,
        "id": "3983"
    },
    "goku-money": {
        "enabled": true,
        "id": "3758"
    },
    "allbridge-classic": {
        "enabled": true,
        "id": "577"
    },
    "monocerus": {
        disabled: true,
        "enabled": true,
        "id": "3622"
    },
    "first-crypto-bank": {
        enabled: true,
        id: "4017"
    },
    "fwx": {
        "enabled": true,
        "id": "4026"
    },
    "keom": {
        "enabled": true,
        "id": "3823"
    },
    "squadswap-v2": {
        parentId: "SquadSwap",
        "enabled": true,
        "id": "4009"
    },
    "squadswap-v3": {
        parentId: "SquadSwap",
        "enabled": true,
        "id": "4010"
    },
    "zerion-wallet": {
        "enabled": true,
        "id": "4049"
    },
    "goldfinch": {
        "enabled": true,
        "id": "703"
    },
    "zkswap-finance": {
        "enabled": true,
        "id": "3180"
    },
    "horiza": {
        "enabled": true,
        "id": "4041"
    },
    "manta": {
        category: "Rollup",
        "enabled": true,
        "id": "13631"
    },
    "equation-v2": {
        parentId: "Equation",
        "enabled": true,
        "id": "4074"
    },
    "lexer": {
        "enabled": true,
        "id": "4087"
    },
    "garden": {
        "enabled": true,
        "id": "4086"
    },
    "hyperionx": {
        "enabled": true,
        "id": "4094"
    },
    "kinetix-derivatives-v2": {
        parentId: "Kinetix",
        "enabled": true,
        "id": "4110"
    },
    "pingu": {
        "enabled": true,
        "id": "4102"
    },
    "supswap-v2": {
        parentId: "SupSwap",
        "enabled": true,
        "id": "4117"
    },
    "supswap-v3": {
        parentId: "SupSwap",
        "enabled": true,
        "id": "4118"
    },
    "vaultka": {
        "enabled": true,
        "id": "2531"
    },
    "Omnidrome": {
        "enabled": true,
        "id": "4119"
    },
    "marinade-liquid-staking": {
        parentId: "Marinade",
        "enabled": true,
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
        "enabled": true,
        "id": "3672"
    },
    "dragonswap": {
        "enabled": true,
        parentId: "DragonSwap",
        "id": "4138",
        protocolsData: {
            "v2": {
                "id": "4138",
                "enabled": true,
            },
            "v3": {
                "id": "4139",
                "enabled": true,
            }
        }
    },
    "inverse-finance": {
        parentId: "Inverse Finance",
        "enabled": true,
        "id": "2433"
    },
    "furucombo": {
        "enabled": true,
        "id": "742"
    },
    "instadapp": {
        "enabled": true,
        "id": "120"
    },
    "summer.fi": {
        "enabled": true,
        "id": "3284"
    },
    "integral": {
        "enabled": true,
        "id": "291"
    },
    "bonk-bot": {
        "enabled": true,
        "id": "4227"
    },
    "lens-protocol": {
        "enabled": true,
        "id": "4235"
    },
    "ethena": {
        "enabled": true,
        "id": "4133"
    },
    "avantis": {
        enabled: true,
        "id": "4108"
    },
    "cellana-finance": {
        "id": "4194",
        "enabled": true,
    },
    "nile-exchange": {
        parentId: "Nile Exchange",
        "enabled": true,
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
        "enabled": true,
        "id": "4128"
    },
    "sharpe-earn": {
        "enabled": true,
        "id": "2756"
    },
    "morpho": {
        parentId: "Morpho",
        "enabled": true,
        "id": "4025"
    },
    "blitz": {
        id: "4214",
        enabled: true,
    },
    "fx-protocol": {
        enabled: true,
        id: "3344"
    },
    "swop": {
        enabled: true,
        id: "613"
    },
    "javsphere": {
        enabled: true,
        id: "4366"
    },
    "frax-amo": {
        parentId: "Frax Finance",
        enabled: true,
        id: "359"
    }
} as AdaptorsConfig
