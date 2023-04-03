import { AdaptorsConfig } from "../types"
import { seaportCollections } from "./collections"

export default {
    "aave": {
        "enabled": true,
        "startFrom": 1647648000,
        "id": "111",
        protocolsData: {
            v1: {
                "id": "1838",
                enabled: true,
            },
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
        "enabled": true,
        "id": "373"
    },
    "bitcoin": {
        "enabled": true,
        "id": "1"
    },
    "bsc": {
        "enabled": true,
        "id": "1839"
    },
    "compound": {
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
        "enabled": true,
        "id": "2121"
    },
    "gmx": {
        "enabled": true,
        "id": "337",
        "gmx": {
            enabled: true,
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
        protocolsData: {
            v1: {
                "id": "2630",
                enabled: true,
                displayName: "Opensea V1"
            },
            v2: {
                "id": "2631",
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
        protocolsData: {
            classic: {
                id: "119",
                enabled: true,
            },
            trident: {
                id: "2152",
                enabled: true,
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
        "enabled": true,
        "id": "1799"
    },
    "wombat-exchange": {
        "enabled": true,
        "id": "1700"
    },
    "woofi": {
        "enabled": true,
        "id": "1461"
    },
    "metavault.trade": {
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
        "enabled": true,
        "id": "311"
    },
    "apeswap": {
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
        "enabled": true,
        "id": "1584"
    },
    "gains-network": {
        "enabled": true,
        "id": "1018"
    },
    "ghostmarket": {
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
        "enabled": true,
        "id": "1853"
    },
    "moonwell-apollo": {
        "enabled": true,
        "id": "1401"
    },
    "kperp-exchange": {
        "enabled": true,
        "id": "2326"
    },
    "premia": {
        "enabled": true,
        "id": "381"
    },
    "kyberswap": {
        "enabled": true,
        "id": "127",
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
        "enabled": true,
        "id": "2356"
    },
    "gearbox": {
        "enabled": true,
        "id": "1108"
    },
    "predy-finance": {
        "enabled": true,
        "id": "1657"
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
        "enabled": true,
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
        enabled: true,
        "id": "2221"
    },
    "frax-fpi": {
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
        enabled: true,
        id: "2332"
    },
    "camelot": {
        enabled: true,
        id: "2307"
    },
    "thena": {
        enabled: true,
        id: "2417"
    },
    "paraswap": {
        enabled: true,
        id: "894"
    },
    "ramses-exchange": {
        enabled: true,
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
        enabled: true,
        displayName: "Chainlink VRF V1",
        id: "2623",
    },
    "chainlink-vrf-v2": {
        enabled: true,
        displayName: "Chainlink VRF V2",
        id: "2623"
    },
    "chainlink-keepers": {
        enabled: true,
        displayName: "Chainlink Keepers",
        id: "2623"
    },
    "chainlink-requests": {
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
        id: "1274"
    },
    "maia-v3": {
        "enabled": true,
        "id": "2760"
    },
    "morphex": {
        "enabled": true,
        "id": "2662"
    },
    'opensea-seaport-collections': {
        id: "opensea-seaport-collections",
        enabled: true,
        protocolsData: {
            '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb': { id: '11', enabled: true },
            '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d': { id: '12', enabled: true },
            '0x60e4d786628fea6478f785a6d7e704777c86a7c6': { id: '13', enabled: true },
            '0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258': { id: '14', enabled: true },
            '0xed5af388653567af2f388e6224dc7c4b3241c544': { id: '15', enabled: true },
            '0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b': { id: '16', enabled: true },
            '0x23581767a106ae21c074b2276d25e5c3e136a68b': { id: '17', enabled: true },
            '0x5cc5b05a8a13e3fbdb0bb9fccd98d38e50f90c38': { id: '18', enabled: true },
            '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e': { id: '19', enabled: true },
            '0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d': { id: '20', enabled: true },
            '0x51f0c1938b0e67cafc7a6fc8eb6edd7fdbe002bc': { id: "21", enabled: true },
            '0x08d7c0242953446436f34b4c78fe9da38c73668d': { id: "22", enabled: true },
            '0x960b7a6bcd451c9968473f7bbfd9be826efd549a': { id: "23", enabled: true },
            '0x845a007d9f283614f403a24e3eb3455f720559ca': { id: "24", enabled: true },
            '0x59468516a8259058bad1ca5f8f4bff190d30e066': { id: "25", enabled: true },
            '0x5f076e995290f3f9aea85fdd06d8fae118f2b75c': { id: "26", enabled: true },
            '0x19b86299c21505cdf59ce63740b240a9c822b5e4': { id: "27", enabled: true },
            '0xdb46d1dc155634fbc732f92e853b10b288ad5a1d': { id: "28", enabled: true },
            '0x7d8820fa92eb1584636f4f5b8515b5476b75171a': { id: "29", enabled: true },
            '0xe70659b717112ac4e14284d0db2f5d5703df8e43': { id: "30", enabled: true },
            '0xd57474e76c9ebecc01b65a1494f0a1211df7bcd8': { id: "31", enabled: true },
            '0x24a11e702cd90f034ea44faf1e180c0c654ac5d9': { id: "32", enabled: true },
            '0x98c7fa114b2fe921ba97f628e9dcb72890491721': { id: "33", enabled: true },
            '0x6794870dd693c9a9786b13de3bd21a0d0b5ba769': { id: "34", enabled: true },
            '0xc589770757cd0d372c54568bf7e5e1d56b958015': { id: "35", enabled: true },
            '0xcbeb9b45ba9fbfbbccc289ee48dadd6fb65ae2a7': { id: "36", enabled: true },
            '0xccdf1373040d9ca4b5be1392d1945c1dae4a862c': { id: "37", enabled: true },
            '0x720786231ddf158ebd23bd590f73b29bff78d783': { id: "38", enabled: true },
            '0x94ef36a4874260036b368fbb088abba369e50279': { id: "39", enabled: true },
            '0x4e1f41613c9084fdb9e34e11fae9412427480e56': { id: "40", enabled: true },
            '0xbfe47d6d4090940d1c7a0066b63d23875e3e2ac5': { id: "41", enabled: true },
            '0x33fd426905f149f8376e227d0c9d3340aad17af1': { id: "42", enabled: true },
            '0x231d3559aa848bf10366fb9868590f01d34bf240': { id: "43", enabled: true },
            '0xbce3781ae7ca1a5e050bd9c4c77369867ebc307e': { id: "44", enabled: true },
            '0x524cab2ec69124574082676e6f654a18df49a048': { id: "45", enabled: true },
            '0xa3aee8bce55beea1951ef834b99f3ac60d1abeeb': { id: "46", enabled: true },
            '0x492ac8967f3cabab2afbb971b2e5981399f11f2a': { id: "47", enabled: true },
            '0xd5563069c97976ee8ab817a7218f213a6bb467a1': { id: "48", enabled: true },
            '0xe785e82358879f061bc3dcac6f0444462d4b5330': { id: "49", enabled: true },
            '0xe31125ba759377a1dd6197db94d698079ece11b2': { id: "50", enabled: true },
            '0x5af0d9827e0c53e4799bb226655a1de152a425a5': { id: "51", enabled: true },
            '0x670fd103b1a08628e9557cd66b87ded841115190': { id: "52", enabled: true },
            '0x3f3915fb8769ee456035331bc2f7fbe380f6b4d2': { id: "53", enabled: true },
            '0xd1258db6ac08eb0e625b75b371c023da478e94a9': { id: "54", enabled: true },
            '0x7daec605e9e2a1717326eedfd660601e2753a057': { id: "55", enabled: true },
            '0xa97ad3ce4d36b9d782ca7a2d45b25a052c44dce6': { id: "56", enabled: true },
            '0x0be4e2375eccb6df1c2f110fd9c3abd9a1b1b117': { id: "57", enabled: true },
            '0x667d28ca8a8f4391fe13c92d36e60c7615d2f8db': { id: "58", enabled: true },
            '0x82c7a8f707110f5fbb16184a5933e9f78a34c6ab': { id: "59", enabled: true },
            '0x036721e5a769cc48b3189efbb9cce4471e8a48b1': { id: "60", enabled: true },
            '0x7614632d063fb1f335b36c612f8dfc52e5c62420': { id: "61", enabled: true },
            '0xc99c679c50033bbc5321eb88752e89a93e9e83c5': { id: "62", enabled: true },
            '0xacf63e56fd08970b43401492a02f6f38b6635c91': { id: "63", enabled: true },
            '0xc9677cd8e9652f1b1aadd3429769b0ef8d7a0425': { id: "64", enabled: true },
            '0x1792a96e5668ad7c167ab804a100ce42395ce54d': { id: "65", enabled: true },
            '0x8821bee2ba0df28761afff119d66390d594cd280': { id: "66", enabled: true },
            '0x77372a4cc66063575b05b44481f059be356964a4': { id: "67", enabled: true },
            '0xb852c6b5892256c264cc2c888ea462189154d8d7': { id: "68", enabled: true },
            '0xa6cd272874ee7c872eb66801eff62784c0b13285': { id: "69", enabled: true },
            '0xf7479f9527c57167caff6386daa588b7bf05727f': { id: "70", enabled: true },
            '0x306b1ea3ecdf94ab739f1910bbda052ed4a9f949': { id: "71", enabled: true },
            '0x062e691c2054de82f28008a8ccc6d7a1c8ce060d': { id: "72", enabled: true },
            '0x59ad67e9c6a84e602bc73b3a606f731cc6df210d': { id: "73", enabled: true },
            '0x39ee2c7b3cb80254225884ca001f57118c8f21b6': { id: "74", enabled: true },
            '0x79fcdef22feed20eddacbb2587640e45491b757f': { id: "75", enabled: true },
            '0x1a92f7381b9f03921564a437210bb9396471050c': { id: "76", enabled: true },
            '0x364c828ee171616a39897688a831c2499ad972ec': { id: "77", enabled: true },
            '0x9401518f4ebba857baa879d9f76e1cc8b31ed197': { id: "78", enabled: true },
            '0x3bf2922f4520a8ba0c2efc3d2a1539678dad5e9d': { id: "79", enabled: true },
            '0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7': { id: "80", enabled: true },
            '0x282bdd42f4eb70e7a9d9f40c8fea0825b7f68c5d': { id: "81", enabled: true },
            '0x764aeebcf425d56800ef2c84f2578689415a2daa': { id: "82", enabled: true },
            '0x394e3d3044fc89fcdd966d3cb35ac0b32b0cda91': { id: "83", enabled: true },
            '0x34eebee6942d8def3c125458d1a86e0a897fd6f9': { id: "84", enabled: true },
            '0x59325733eb952a92e069c87f0a6168b29e80627f': { id: "85", enabled: true },
            '0x769272677fab02575e84945f03eca517acc544cc': { id: "86", enabled: true },
            '0xd774557b647330c91bf44cfeab205095f7e6c367': { id: "87", enabled: true },
            '0x363c5dc3ff5a93c9ab1ec54337d211148e10f567': { id: "88", enabled: true },
            '0xe2e27b49e405f6c25796167b2500c195f972ebac': { id: "89", enabled: true },
            '0x6339e5e072086621540d0362c4e3cea0d643e114': { id: "90", enabled: true },
            '0x4b15a9c28034dc83db40cd810001427d3bd7163d': { id: "91", enabled: true },
            '0xbd3531da5cf5857e7cfaa92426877b022e612cf8': { id: "92", enabled: true },
            '0xba30e5f9bb24caa003e9f2f0497ad287fdf95623': { id: "93", enabled: true },
            '0xb7f7f6c52f2e2fdb1963eab30438024864c313f6': { id: "94", enabled: true },
        }
    }
} as AdaptorsConfig
