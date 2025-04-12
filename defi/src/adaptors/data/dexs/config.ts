import { AdaptorsConfig } from "../types"

export default {
    "balancer": {
        "id": "116",
        parentId: "Balancer",
        protocolsData: {
            v1: {
                id: "116",
                displayName: "Balancer V1",
            },
            v2: {
                id: "2611",
                displayName: "Balancer V2",
            }
        },
        cleanRecordsConfig: {
            genuineSpikes: {
                1718755200: true,
                1722297600: true
            }
        }
    },
    "bancor": {
        "id": "162",
        parentId: "Bancor",
        protocolsData: {
            v3: {
                id: "1995",
            },
            "v2.1": {
                id: "162",
            }
        }
    },
    "champagneswap": {
        disabled: true,
        "id": "1643"
    },
    "katana": {
        "id": "797"
    },
    // "pancakeswap": { // moved to protocol/config.ts
    //     "id": "194",
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
    //             "id": "2529",
    //             startFrom: 1663718400
    //         },
    //         v3: {
    //             "id": "2769"
    //         }
    //     },
    //     cleanRecordsConfig: {
    //         genuineSpikes: {
    //             1660176000: false,
    //             1665014400: false
    //         }
    //     }
    // },
    "raydium": {
        "id": "214",
        cleanRecordsConfig: {
            genuineSpikes: {
                1685318400: false
            }
        }
    },
    // "uniswap": {  // moved to protocol/config.ts
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
    //     cleanRecordsConfig: {
    //         genuineSpikes: {
    //             1665446400: true
    //         }
    //     }
    // },
    "traderjoe": {
        "id": "468",
        parentId: "Trader Joe",
        protocolsData: {
            v1: {
                id: "468"
            },
            v2: {
                id: "2393"
            }
        }
    },
    "sushiswap": {
        "id": "119",
        parentId: "Sushi",
        protocolsData: {
            classic: {
                id: "119"
            },
            trident: {
                id: "2152"
            },
            v3: {
                id: "2776"
            }
        },
        cleanRecordsConfig: {
            genuineSpikes: {
                1712793600: false
            }
        }
    },
    "spookyswap": {
        "id": "302"
    },
    "spiritswap": {
        parentId: "SpiritSwap",
        "id": "311"
    },
    "soulswap": {
        "id": "544"
    },
    "klayswap": {
        "id": "508"
    },
    "osmosis": {
        "id": "383"
    },
    "serum": {
        disabled: true,
        "id": "145"
    },
    "curve": {
        "id": "3"
    },
    "mooniswap": {
        "id": "1053"
    },
    "dodo": {
        "id": "146"
    },
    "velodrome": {
        parentId: "Velodrome",
        "id": "1799"
    },
    "gmx": {
        parentId: "GMX",
        "protocolsData": {
            "swap": {
                "id": "5069",
                "category": "Dexs",
                "displayName": "GMX - SWAP"
            }
        },
        "id": "337"
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
                id: "2239"
            },
            "liquidityHub": {
                id: "3743"
            }
        }
    },
    "woofi": {
        parentId: "WOOFi",
        "id": "1461"
    },
    "hashflow": {
        "id": "1447"
    },
    "zipswap": {
        "id": "1296"
    },
    "wardenswap": {
        "id": "392"
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
    "ref-finance": {
        "id": "541"
    },
    "solidly": {
        parentId: "Solidly Labs",
        "id": "1407"
    },
    "orca": {
        "id": "283"
    },
    "saber": {
        "id": "419"
    },
    "platypus": {
        disabled: true,
        "id": "944",
        cleanRecordsConfig: {
            genuineSpikes: {
                1697068800: false
            }
        }
    },
    "yoshi-exchange": {
        "id": "863"
    },
    "biswap": {
        parentId: "BiSwap",
        "id": "373"
    },
    "apeswap": {
        parentId: "ApeSwap",
        "id": "398"
    },
    "pangolin": {
        "id": "246"
    },
    "minswap": {
        "id": "1494"
    },
    "wingriders": {
        "id": "1601"
    },
    "wombat-exchange": {
        "id": "1700"
    },
    "dfyn": {
        "id": "318"
    },
    "flamingo-finance": {
        "id": "304"
    },
    "0x": {
        "id": "2116",
        parentId: "2116",
        protocolsData: {
            "0x RFQ": {
                "id": "2116",
                displayName: "0x - RFQ"
            }
        }
    },
    "baryon": {
        "enabled": false,
        "id": "1950"
    },
    "cherryswap": {
        "id": "543"
    },
    "clipper": {
        "id": "622"
    },
    "cryptoswap": {
        "id": "1750"
    },
    "ellipsis": {
        "id": "238"
    },
    "klex-finance": {
        disabled: true,
        "id": "2049"
    },
    "koyo": {
        disabled: true,
        "id": "1766"
    },
    "pyeswap": {
        disabled: true,
        "id": "2109"
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
    "sunswap": {
        parentId: "SUN.io",
        "id": "690",
        cleanRecordsConfig: {
            genuineSpikes: {
                1689984000: false
            }
        }
    },
    "whaleswap": {
        disabled: true,
        "id": "1884"
    },
    "nomiswap": {
        "enabled": false,
        "id": "1823"
    },
    "beethoven-x": {
        parentId: "Beethoven X",
        "id": "654"
    },
    "defi-swap": {
        "id": "221",
        cleanRecordsConfig: {
            genuineSpikes: {
                1683676800: false,
                1700524800: true
            }
        }
    },
    "wanswap-dex": {
        "id": "186"
    },
    "solarbeam": {
        "id": "551"
    },
    "tomb-swap": {
        parentId: "Tomb Finance",
        "id": "2129"
    },
    "dfx-finance": {
        "id": "366"
    },
    "frax-swap": {
        parentId: "Frax Finance",
        "id": "2121"
    },
    "iziswap": {
        parentId: "iZUMI Finance",
        "id": "1883",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1700524800": true,
                "1700611200": true,
                "1700697600": true,
                "1700784000": true,
                "1700870400": true,
            },
        }
    },
    "tinyman": {
        "id": "680"
    },
    "junoswap": {
        disabled: true,
        "id": "2052"
    },
    "knightswap-finance": {
        "id": "942"
    },
    "mdex": {
        "id": "334"
    },
    "meshswap": {
        "id": "1726"
    },
    "mm-stableswap-polygon": {
        parentId: "MM Finance",
        "id": "2015"
    },
    "radioshack": {
        "id": "1616"
    },
    "mojitoswap": {
        "id": "1181"
    },
    "yieldfields": {
        "id": "1347"
    },
    "terraswap": {
        disabled: true,
        "id": "491"
    },
    "saros": {
        disabled: true,
        "id": "1262"
    },
    "vvs-finance": {
        "id": "831"
    },
    "shibaswap": {
        "id": "397"
    },
    "viperswap": {
        disabled: true,
        "id": "313"
    },
    "oolongswap": {
        "id": "794"
    },
    "swapr": {
        "id": "292"
    },
    "cone": {
        "id": "1970"
    },
    "claimswap": {
        "id": "1455"
    },
    "spartacus-exchange": {
        "id": "1755"
    },
    "beamswap": {
        "id": "1289",
        parentId: "BeamSwap",
        protocolsData: {
            "classic": {
                id: "1289",
            },
            "stable-amm": {
                id: "2596",
            }
        }
    },
    "openleverage": {
        "id": "1208"
    },
    "ubeswap": {
        "id": "488",
        cleanRecordsConfig: {
            genuineSpikes: {
                1675555200: true
            }
        }
    },
    "mobius-money": {
        "id": "588"
    },
    "honeyswap": {
        "id": "271"
    },
    "energiswap": {
        "id": "242"
    },
    "stellaswap": {
        "id": "1274"
    },
    "wagyuswap": {
        disabled: true,
        "id": "1003"
    },
    "dystopia": {
        "id": "1756"
    },
    "glide-finance": {
        "id": "806"
    },
    "quipuswap": {
        "id": "513"
    },
    "netswap": {
        "id": "1140"
    },
    "astroport": {
        disabled: true,
        "id": "1052"
    },
    "tethys-finance": {
        parentId: "Tethys Finance",
        "id": "1139"
    },
    "mimo": {
        disabled: true,
        "id": "1241"
    },
    "kaidex": {
        "id": "712"
    },
    "lif3-swap": {
        parentId: "Lif3.com",
        "id": "2040"
    },
    "swappi": {
        "id": "1660"
    },
    "yodeswap": {
        disabled: true,
        "id": "1980"
    },
    "defi-kingdoms": {
        disabled: true,
        "id": "556",
        cleanRecordsConfig: {
            genuineSpikes: {
                1656028800: false
            }
        }
    },
    "defiplaza": {
        "id": "728"
    },
    "polycat": {
        parentId: "Polycat Finance",
        "id": "499"
    },
    "voltswap": {
        parentId: "Volt Finance",
        protocolsData: {
            v1: {
                "disabled": true,
                "id": "1225",
                displayName: "VoltSwap V1",
            },
            v2: {
                id: "2133",
            }
        },
        "id": "1225"
    },
    "yokaiswap": {
        "id": "1002"
    },
    "protofi": {
        "id": "1306"
    },
    "voltage": {
        "id": "714"
    },
    "complus-network": {
        "id": "471"
    },
    "padswap": {
        "id": "644"
    },
    "sharkswap": {
        "id": "1828"
    },
    "okcswap": {
        "id": "2099"
    },
    "empiredex": {
        "id": "812"
    },
    "makiswap": {
        disabled: true,
        "id": "378"
    },
    "smartdex": {
        "id": "883"
    },
    "cometh": {
        "id": "261"
    },
    "xexchange": {
        "id": "854"
    },
    "defichain-dex": {
        "id": "1166"
    },
    "blue-planet": {
        parentId: "Planet",
        "id": "2158"
    },
    "aldrin": {
        disabled: true,
        "id": "739"
    },
    "capricorn-finance": {
        disabled: true,
        "id": "2128"
    },
    "alex": {
        "id": "1466"
    },
    "step-exchange": {
        "id": "2312"
    },
    "pegasys": {
        parentId: "PegaSys",
        "id": "1432"
    },
    "crodex": {
        disabled: true,
        "id": "828"
    },
    "babyswap": {
        "id": "597",
        cleanRecordsConfig: {
            genuineSpikes: {
                1705881600: false,
                1712880000: false
            }
        }
    },
    "lifinity": {
        "id": "2154"
    },
    "vanswap": {
        "id": "2066"
    },
    "dao-swap": {
        parentId: "DAO Maker",
        "id": "2167"
    },
    "jswap": {
        disabled: true,
        "id": "678"
    },
    "babydogeswap": {
        "id": "2169",
        cleanRecordsConfig: {
            genuineSpikes: {
                1685232000: false,
                1687305600: false
            }
        }
    },
    "wigoswap": {
        "id": "1351"
    },
    "levinswap": {
        "id": "299"
    },
    "templedao-trade": {
        parentId: "Temple DAO",
        "id": "2178"
    },
    "karura-swap": {
        "id": "451"
    },
    "sphynx": {
        "id": "1992"
    },
    "kuswap": {
        "id": "480"
    },
    "paint-swap": {
        "id": "421"
    },
    "benswap": {
        "id": "749"
    },
    "surfswap": {
        "id": "1868",
        parentId: "Surfswap",
        protocolsData: {
            classic: {
                "id": "1868",
            },
            "stable-amm": {
                "id": "2598",
            }
        }
    },
    "bogged-finance": {
        "enabled": false,
        "id": "617"
    },
    "jetswap": {
        "id": "659"
    },
    "saucerswap": {
        "id": "1979"
    },
    "synthetify": {
        "id": "731"
    },
    "pandora": {
        "id": "1698"
    },
    "paycash": {
        "id": "1452"
    },
    "soy-finance": {
        "id": "1008"
    },
    "photonswap-finance": {
        disabled: true,
        "id": "847"
    },
    "alita-finance": {
        "id": "561"
    },
    "unifi": {
        "id": "646"
    },
    "wineryswap": {
        disabled: true,
        "id": "2118"
    },
    "huckleberry": {
        parentId: "Huckleberry",
        "id": "630"
    },
    "hakuswap": {
        "id": "1253"
    },
    "leonicornswap": {
        "id": "923"
    },
    "autoshark": {
        "id": "1074"
    },
    "saddle-finance": {
        "id": "202"
    },
    "titano-swych": {
        "id": "2102"
    },
    // "stellarx": {
    //     "id": "972"
    // },
    "ultronswap": {
        "id": "2032"
    },
    "humble-defi": {
        "id": "1629"
    },
    "pact": {
        "id": "1468"
    },
    "algofi": {
        parentId: "Algofi",
        disabled: true,
        "id": "2091"
    },
    "elk": {
        "id": "420"
    },
    "luaswap": {
        "id": "707"
    },
    "unicly": {
        disabled: true,
        "id": "324"
    },
    "crema-finance": {
        "id": "1412"
    },
    "icecreamswap": {
        parentId: "IcecreamSwap",
        disabled: true,
        "id": "1990"
    },
    "arctic": {
        "enabled": false,
        "id": "2176"
    },
    "swapsicle": {
        "enabled": false,
        "id": "1824"
    },
    "morpheus-swap": {
        "id": "581"
    },
    "fairyswap": {
        parentId: "FairySwap",
        disabled: true,
        "id": "1671"
    },
    "moon-swap": {
        "id": "1942"
    },
    "fx-swap": {
        "id": "2138"
    },
    "pinkswap": {
        "id": "367"
    },
    "spartan": {
        "id": "1246"
    },
    "penguin": {
        "id": "1575"
    },
    "vortex-protocol": {
        "enabled": false,
        "id": "1706"
    },
    "dinosaur-eggs": {
        "id": "695"
    },
    "mcdex": {
        "enabled": false,
        "id": "232"
    },
    "mistswap": {
        disabled: true,
        "id": "748"
    },
    "bxh": {
        "id": "404"
    },
    "auraswap": {
        "id": "1859"
    },
    "carbonswap": {
        "id": "670"
    },
    "pangea-swap": {
        "id": "1987"
    },
    "gravity-finance": {
        "id": "351"
    },
    "4swap": {
        parentId: "Pando",
        disabled: true,
        "id": "951"
    },
    "gravis": {
        "id": "2195"
    },
    "tetu": {
        parentId: "parent#tetu",
        "id": "2203"
    },
    "muesliswap": {
        "id": "747"
    },
    "gin-finance": {
        "id": "1795"
    },
    "ferro": {
        "id": "1882"
    },
    "increment-swap": {
        parentId: "incrementFinance",
        "id": "1907"
    },
    "chainge-finance": {
        "id": "704"
    },
    "minerswap": {
        "enabled": false,
        "id": "2233"
    },
    "wavelength-dao": {
        "id": "2220"
    },
    "thorswap": {
        "id": "412"
    },
    "metatdex": {
        "id": "2253"
    },
    "3xcalibur": {
        "id": "2283"
    },
    "kava-swap": {
        "id": "618"
    },
    "emdx": {
        "enabled": false,
        "id": "2299"
    },
    "cetus": {
        parentId: "Cetus",
        "id": "2289",
        protocolsData: {
            "cetus": {
                "id": "2289",
            }
        }
    },
    "opx-finance": {
        "id": "2256"
    },
    "camelot": {
        parentId: "Camelot",
        "id": "2307"
    },
    "openbook": {
        "id": "2322"
    },
    "orderly-network": {
        "id": "2264",
        protocolsData: {
            "orderly-network": {
                "id": "5088",
            }
        },
        cleanRecordsConfig: {
            genuineSpikes: {
                1712188800: false
            }
        }
    },
    "ghostmarket": {
        "enabled": false,
        "id": "2290"
    },
    "synfutures": {
        "enabled": false,
        "id": "2328"
    },
    "xswap-protocol": {
        "id": "2145"
    },
    "kperp-exchange": {
        "enabled": false,
        "id": "2326"
    },
    "jojo": {
        "enabled": false,
        "id": "2320"
    },
    "vapordex": {
        "id": "2342",
        protocolsData: {
            v1: {
                "id": "2342",
            },
            v2: {
                "id": "3654",
            }
        }
    },
    "10kswap": {
        "id": "2345"
    },
    "solarflare": {
        "id": "1269"
    },
    "sundaeswap": {
        "id": "1302"
    },
    "wx.network": {
        "enabled": false,
        "id": "614"
    },
    "myswap": {
        parentId: "mySwap",
        "id": "2367"
    },
    "liquidswap": {
        "id": "2210"
    },
    "rubicon": {
        "id": "799"
    },
    "aux-exchange": {
        "id": "2213"
    },
    "wojak-finance": {
        disabled: true,
        "id": "2113"
    },
    "ampleswap": {
        "id": "2383"
    },
    "heliswap": {
        "id": "2244"
    },
    "wingswap": {
        "id": "976"
    },
    "zircon-gamma": {
        disabled: true,
        "id": "2143"
    },
    "lumenswap": {
        "id": "882"
    },
    "el-dorado-exchange": {
        disabled: true,
        "id": "2356",
        parentId: "EDE",
        "protocolsData": {
            "swap": {
                "id": "2356",
                "category": "Dexs",
                "displayName": "El Dorado Exchange - SWAP"
            }
        },
    },
    "mummy-finance": {
        "id": "2361"
    },
    "level-finance": {
        "id": "2395",
        protocolsData: {
            "level-finance": {
                "id": "5089",
            }
        }
    },
    "hyperjump": {
        "id": "317"
    },
    "kokonut-swap": {
        "id": "1790"
    },
    "demex": {
        "id": "2001",
        "protocolsData": {
            "demex": {
                "id": "5073",
            }
        }
    },
    "syrup-finance": {
        disabled: true,
        "id": "2401"
    },
    "axial": {
        disabled: true,
        "id": "845"
    },
    "exinswap": {
        "id": "1179"
    },
    "darkness": {
        disabled: true,
        "id": "1555"
    },
    "zilswap": {
        "id": "303"
    },
    "thena": {
        name: "Thena V1",
        displayName: "Thena V1",
        "id": "2417"
    },
    "ttswap": {
        "id": "705"
    },
    "aequinox": {
        disabled: true,
        "id": "2090"
    },
    "vexchange": {
        "id": "963"
    },
    "metropolis": {
        disabled: true,
        "id": "2452"
    },
    "verse": {
        "id": "1732"
    },
    "equalizer-exchange": {
        parentId: "Equalizer",
        "id": "2332"
    },
    "canto-dex": {
        "id": "1985"
    },
    "solidlydex": {
        parentId: "Solidly Labs",
        "id": "2400"
    },
    "defibox": {
        "id": "507"
    },
    "shell-protocol": {
        "id": "133"
    },
    "archly-finance": {
        parentId: "Archly Finance",
        "id": "2317"
    },
    "zyberswap": {
        "id": "2467",
        parentId: "ZyberSwap",
        protocolsData: {
            "v2": {
                id: "2467"
            },
            "v3": {
                id: "2602"
            },
            "stable": {
                id: "2530"
            }
        }
    },
    "hermes-protocol": {
        "id": "1384"
    },
    "hiveswap": {
        parentId: "HiveSwap",
        "id": "2485"
    },
    "plenty": {
        "id": "490"
    },
    "jediswap": {
        parentId: "JediSwap",
        "enabled": false,
        "id": "2344"
    },
    "solidlizard": {
        "id": "2528"
    },
    "onepunch": {
        disabled: true,
        "id": "2534"
    },
    "thorwallet": {
        "enabled": false,
        "id": "2533"
    },
    "helix": {
        "id": "2259",
        protocolsData: {
            "helix": {
                "id": "2259",
            }
        }
    },
    "ashswap": {
        "id": "2551"
    },
    "veniceswap": {
        disabled: true,
        "id": "2550"
    },
    "oraidex": {
        "id": "2564"
    },
    "subzero-zswap": {
        "id": "2556"
    },
    "megaton-finance": {
        "id": "2540"
    },
    "bakeryswap": {
        "enabled": false,
        "id": "602"
    },
    "bisq": {
        "id": "2588"
    },
    "dexalot": {
        "id": "2589"
    },
    "metavault.trade": {
        parentId: "MetaVault",
        "id": "1801",
        protocolsData: {
            "metavault.trade": {
                "id": "5072",
            }
        }
    },
    "1inch": {
        enabled: false,
        id: "189"
    },
    /* "carthage": {
        enabled: false,
        id: 1944
    }, */
    "dexible": {
        enabled: false,
        id: "2249",
        parentId: "2249",
        protocolsData: {
            Dexible_v2: {
                id: "2249",
                enabled: false
            }
        }
    },
    "alienfi": {
        id: "2603"
    },
    "oswap": {
        parentId: "Oswap",
        id: "1778"
    },
    "maverick": {
        parentId: "Maverick Protocol",
        id: "2644"
    },
    "integral": {
        id: "291"
    },
    "archerswap": {
        id: "2648"
    },
    "ponytaswap": {
        id: "2657"
    },
    "equilibre": {
        id: "2586"
    },
    "wemix.fi": {
        parentId: "WEMIX.FI",
        id: "2674"
    },
    "ramses-exchange": {
        parentId: "Ramses Exchange",
        id: "2675"
    },
    "zigzag": {
        id: "800"
    },
    "mute.io": {
        parentId: "Koi Finance",
        id: "2727"
    },
    "dexter": {
        id: "2737"
    },
    "swapline": {
        "id": "2731"
    },
    "hadouken-amm": {
        parentId: "Hadouken Finance",
        "id": "2748"
    },
    "acala-swap": {
        "id": "1847"
    },
    "maia-v3": {
        "id": "2760"
    },
    "morphex": {
        parentId: "Morphex",
        "protocolsData": {
            "swap": {
                "id": "5116",
                "category": "Dexs",
                "displayName": "Morphex - SWAP"
            }
        },
        "id": "2662"
    },
    "kyotoswap": {
        "id": "2350"
    },
    "SmarDex": {
        "id": "2695"
    },
    "mm-finance-arbitrum": {
        parentId: "MM Finance",
        "id": "2754"
    },
    "native": {
        "id": "2803"
    },
    "spacedex": {
        parentId: "2814",
        "protocolsData": {
            "swap": {
                "id": "2814",
                "category": "Dexs",
                "displayName": "SpaceDex - SWAP"
            }
        },
        "id": "2814"
    },
    "camelot-v3": {
        parentId: "Camelot",
        "id": "2792"
    },
    "satoshiswap": {
        disabled: true,
        "id": "2827"
    },
    "wagmi": {
        "id": "2837"
    },
    "auragi": {
        "id": "2773"
    },
    "covo-v2": {
        disabled: true,
        "id": "2730",
        parentId: "Covo Finance",
        "protocolsData": {
            "swap": {
                "id": "2730",
                disabled: true,
                "category": "Dexs",
                "displayName": "Covo V2 - SWAP",
                cleanRecordsConfig: {
                    genuineSpikes: true
                }
            }
        },
    },
    "polkaswap": {
        "id": "713"
    },
    "thena-v3": {
        parentId: "Thena",
        "id": "2864"
    },
    "astroswap": {
        disabled: true,
        "id": "1368"
    },
    "merlin": {
        "id": "2849"
    },
    "tealswap": {
        "id": "2874"
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
    "pheasantswap": {
        "id": "2896"
    },
    "velocimeter-v2": {
        parentId: "Velocimeter",
        "id": "2668"
    },
    "joe-v2.1": {
        parentId: "Trader Joe",
        "id": "2906",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1682899200": true,
                "1682812800": true
            },
        }
    },
    "chronos": {
        "id": "2907"
    },
    "stellaswap-v3": {
        "id": "2934"
    },
    "e3": {
        "id": "2926"
    },
    "clober": {
        parentId: "Clober",
        "id": "2541"
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
    "vertex-protocol": {
        "id": "2899",
        "protocolsData": {
            "swap": {
                "id": "5117",
                "category": "Dexs"
            }
        },
        cleanRecordsConfig: {
            genuineSpikes: {
                "1689811200": true,
            },
        }
    },
    "lighter": {
        parentId: "Lighter",
        disabled: true,
        "id": "2636"
    },
    "fulcrom-finance": {
        "id": "2641",
        "protocolsData": {
            "swap": {
                "id": "5115",
                "category": "Dexs",
                "displayName": "Fulcrom - SWAP",
            }
        },
    },
    "veax": {
        "id": "2928"
    },
    "dpex": {
        "id": "2488"
    },
    "forge": {
        "id": "2804"
    },
    "interest-protocol": {
        "enabled": false,
        "id": "3015"
    },
    "fxdx": {
        "id": "3036"
    },
    "sunswap-v2": {
        parentId: "SUN.io",
        "id": "3005"
    },
    "pulsex-v1": {
        parentId: "PulseX",
        "id": "2995",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1686009600": true,
            },
        }
    },
    "pulsex-v2": {
        parentId: "PulseX",
        "id": "3060",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1686009600": true,
            },
        }
    },
    "fathom-dex": {
        "id": "3077"
    },
    "heraswap": {
        "id": "3089"
    },
    "miaswap": {
        "id": "3090"
    },
    "hummus": {
        disabled: true,
        "id": "1715"
    },
    "tokenlon": {
        "id": "405",
        "protocolsData": {
            "tokenlon": {
                "id": "405",
            }
        }
    },
    "ramses-exchange-v2": {
        parentId: "Ramses Exchange",
        id: "3096"
    },
    "MantisSwap": {
        id: "2702"
    },
    "abcdefx": {
        id: "2376"
    },
    "thalaswap": {
        parentId: "Thala Labs",
        id: "2795"
    },
    "pearlfi": {
        parentId: "PearlFi",
        id: "3121"
    },
    "ambient": {
        id: "3104"
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
    "litx": {
        disabled: true,
        id: "3159"
    },
    "voodoo-trade": {
        id: "3792",
        "protocolsData": {
            "swap": {
                "id": "3792",
                "category": "Dexs",
            }
        },
    },
    "equity-spot": {
        parentId: "Equalizer",
        id: "3173"
    },
    "flowx-finance": {
        id: "3196"
    },
    "zkSwap_Finance": {
        id: "3180"
    },
    "pinnako": {
        id: "3209",
        "protocolsData": {
            "swap": {
                "id": "3209",
                "category": "Dexs",
            }
        },
    },
    "croswap": {
        disabled: true,
        id: "2942"
    },
    "fusionx-v2": {
        parentId: "FusionX Finance",
        id: "3238"
    },
    "fusionx-v3": {
        parentId: "FusionX Finance",
        id: "3239"
    },
    "DerpDEX": {
        id: "3234"
    },
    "concordex-io": {
        "id": "3172"
    },
    "icpswap": {
        "id": "3257"
    },
    "echodex": {
        parentId: "EchoDEX",
        "id": "3256"
    },
    "reax-one-dex": {
        "id": "3260"
    },
    "deepbook-sui": {
        parentId: "DeepBook",
        "id": "3268",
        cleanRecordsConfig: {
            genuineSpikes: {
                1706659200: false
            }
        }
    },
    "agni-fi": {
        "id": "3265"
    },
    "horizondex": {
        "id": "3255"
    },
    "drift-protocol": {
        "id": "970",
        "protocolsData": {
            "swap": {
                "id": "5071",
            }
        },
    },
    "velodrome-v2": {
        parentId: "Velodrome",
        "id": "3302",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1690156800": true,
                "1690243200": true,
                "1690329600": true,
                "1690416000": true,
            },
        }
    },
    "sobal": {
        "id": "3246"
    },
    "grizzly-trade": {
        disabled: true,
        "id": "3301",
        "protocolsData": {
            "swap": {
                disabled: true,
                "id": "5124",
            }
        },
    },
    "crescent-swap": {
        "id": "3315"
    },
    "brine": {
        "id": "3316"
    },
    "ktx": {
        "id": "3025",
        "protocolsData": {
            "swap": {
                "id": "5121",
            }
        }
    },
    "velocore-v2": {
        "id": "3330"
    },
    "syncswap": {
        "id": "2728"
    },
    "echodex-v3": {
        parentId: "EchoDEX",
        "id": "3349"
    },
    "fcon-dex": {
        disabled: true,
        "id": "3299"
    },
    "throne-v3": {
        "id": "3382",
        parentId: "Throne"
    },
    "dackieswap": {
        parentId: "DackieSwap",
        "id": "3345",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1691971200": true,
                "1691884800": true,
                "1691798400": true,
                "1691712000": true,
            },
        }
    },
    "lynex": {
        "id": "3408"
    },
    "gmx-v2": {
        parentId: "GMX",
        "id": "3365",
        protocolsData: {
            "gmx-v2-swap": {
                "id": "5070",
            }
        },
        cleanRecordsConfig: {
            genuineSpikes: {
                "1723075200": true,
                "1722988800": true,
                "1722902400": true,
            },
        }
    },
    "meridian-trade": {
        "enabled": false,
        "id": "3386",
        "protocolsData": {
            "swap": {
                "id": "3386",
                "enabled": false,
            }
        }
    },
    "hydradx": {
        "id": "3439"
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
    "swapbased": {
        parentId: "SwapBased",
        "id": "3328",
        protocolsData: {
            "v2": {
                "id": "3328",
            },
            "v3": {
                "id": "3409",
            }
        }
    },
    "danogo": {
        "id": "3454"
    },
    "morphex-old": {
        parentId: "Morphex",
        "protocolsData": {
            "swap": {
                "id": "5125",
                disabled: true,
                "category": "Dexs"
            }
        },
        disabled: true,
        "id": "5125"
    },
    "spicyswap": {
        "id": "1029"
    },
    "dackieswap-v2": {
        parentId: "DackieSwap",
        "id": "3515",
    },
    "sithswap": {
        "id": "2719"
    },
    "nether-fi": {
        "protocolsData": {
            "swap": {
                "id": "3509",
                "category": "Dexs"
            }
        },
        "id": "3509"
    },
    "bmx": {
        parentId: "Morphex",
        "id": "3530",
        "protocolsData": {
            "swap": {
                "id": "5126",
                "category": "Dexs"
            }
        }
    },
    "mango-v4": {
        parentId: "Mango Markets",
        "id": "3174",
        protocolsData: {
            "spot": {
                "id": "5122",
            }
        },
        cleanRecordsConfig: {
            genuineSpikes: {
                "1695081600": true,
            },
        }
    },
    "ekubo": {
        "id": "3499"
    },
    "chronos-v2": {
        "id": "3341"
    },
    "solidly-v3": {
        parentId: "Solidly Labs",
        "id": "3481"
    },
    "tegro": {
        "id": "3561"
    },
    "Scale": {
        parentId: "Equalizer",
        "id": "3575"
    },
    "fvm-exchange": {
        parentId: "Velocimeter",
        "id": "3291"
    },
    "blex": {
        "id": "3605",
        protocolsData: {
            "volume": {
                "id": "3605",
            }
        }
    },
    "xena-finance": {
        "id": "3620"
    },
    "spectrum": {
        "id": "1088"
    },
    "turbos": {
        "id": "2940",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1697328000": true,
            },
        }
    },
    "tangleswap": {
        "id": "3585"
    },
    "dx25": {
        "id": "3650"
    },
    "shimmersea": {
        parentId: "MagicSea",
        "id": "3571"
    },
    "kriya-dex": {
        "id": "2939"
    },
    "primex-finance": {
        "id": "3664"
    },
    "candyswap": {
        "id": "3682"
    },
    "luigiswap": {
        "id": "3415"
    },
    "kinetix-v3": {
        parentId: "Kinetix",
        "id": "3534",
        protocolsData: {
            "v3": {
                "id": "3534",
            }
        }
    },
    "caviarnine": {
        parentId: "CaviarNine",
        "id": "3645",
        protocolsData: {
            "orderbook": {
                "id": "3645",
                "category": "Dexs"
            }
        }
    },
    "kinetix-derivative": {
        parentId: "Kinetix",
        "id": "3465"
    },
    "retro": {
        "id": "3311"
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
    "derivio": {
        "enabled": false,
        parentId: "Deri",
        "id": "3759",
        protocolsData: {
            "swap": {
                "id": "3759",
            }
        }
    },
    "elektrik": {
        "id": "3773"
    },
    "caviarnine-lsu-pool": {
        parentId: "CaviarNine",
        "id": "3666"
    },
    "chimpexchange": {
        "id": "3836"
    },
    "lighterv2": {
        parentId: "Lighter",
        "enabled": false,
        "id": "3854"
    },
    "thick": {
        "id": "3878"
    },
    "noah-swap": {
        "id": "2855"
    },
    "ascent": {
        "id": "3867",
        parentId: "Ascent Exchange",
        protocolsData: {
            "v2": {
                "id": "3867",
            },
            "v3": {
                "id": "3868",
            }
        }
    },
    "pegasys-v3": {
        parentId: "PegaSys",
        "id": "3178"
    },
    "canary": {
        "id": "474"
    },
    "xfai": {
        "id": "3816"
    },
    "zebra-v1": {
        parentId: "Zebra",
        "id": "3668"
    },
    "zebra-v2": {
        parentId: "Zebra",
        "id": "3901"
    },
    "astroport-v2": {
        "id": "3117"
    },
    "kizuna": {
        parentId: "KIM Exchange",
        "id": "3913"
    },
    "butterxyz": {
        "id": "3918"
    },
    "swaap": {
        "id": "2104",
        protocolsData: {
            "v1": {
                "id": "2104",
            },
            "v2": {
                "id": "3218",
            }
        }
    },
    "phoenix": {
        displayName: "Phoenix",
        "id": "3170"
    },
    "ryze": {
        "id": "3907"
    },
    "beamex": {
        parentId: "BeamSwap",
        "id": "3251",
        protocolsData: {
            "beamex-swap": {
                "id": "5123",
            }
        }
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
    "aftermath-fi-amm": {
        parentId: "Aftermath Finance",
        "id": "3259"
    },
    "sanctum": {
        "id": "3388",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1704240000": true,
            },
        }
    },
    "jibswap": {
        "id": "3928"
    },
    "zkswap": {
        "id": "3280",
        cleanRecordsConfig: {
            genuineSpikes: {
                1703203200: false,
                1704672000: false
            }
        }
    },
    "trisolaris": {
        "id": "784"
    },
    "nearpad": {
        "id": "953"
    },
    "auroraswap": {
        "id": "1174"
    },
    "wannaswap": {
        "id": "980"
    },
    "allbridge-classic": {
        "id": "577"
    },
    "monocerus": {
        "id": "3622"
    },
    "sunswap-v3": {
        parentId: "SUN.io",
        "id": "4031"
    },
    "squadswap-v2": {
        parentId: "SquadSwap",
        "id": "4009"
    },
    "squadswap-v3": {
        parentId: "SquadSwap",
        "id": "4010"
    },
    "ICDex": {
        "id": "4040"
    },
    "horiza": {
        "id": "4041"
    },
    "lexer": {
        "id": "4087",
        protocolsData: {
            "swap": {
                "id": "4087",
            }
        }
    },
    "starkdefi": {
        "id": "3880",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1707177600": true,
            },
        }
    },
    "hiveswap-v3": {
        parentId: "HiveSwap",
        "id": "4113"
    },
    "supswap-v2": {
        parentId: "SupSwap",
        "id": "4117"
    },
    "supswap-v3": {
        parentId: "SupSwap",
        "id": "4118"
    },
    "econia": {
        "id": "4128"
    },
    "symmetric": {
        "id": "528",
        protocolsData: {
            "v2": {
                "id": "528",
            }
        }
    },
    "Omnidrome": {
        "id": "4119"
    },
    "jediswap-v2": {
        parentId: "JediSwap",
        "id": "4144"
    },
    "swapsicle-v2": {
        parentId: "Swapsicle",
        "id": "3716"
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
    "merchant-moe": {
        parentId: "Merchant Moe",
        "id": "4006"
    },
    "deltaswap": {
        parentId: "GammaSwap Protocol",
        "id": "4062"
    },
    "lynex-v1": {
        parentId: "Lynex",
        "id": "3908"
    },
    // "Scopuly": {
    //     "id": "4181"
    // },
    "standard-mode": {
        "id": "4186"
    },
    "sushi-aptos": {
        parentId: "Sushi",
        "id": "3827"
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
        "id": "4285"
    },
    "archly-finance-v2": {
        parentId: "Archly Finance",
        "id": "3940",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1710288000": true
            }
        }
    },
    "cleopatra-exchange": {
        parentId: "Cleopatra Exchange",
        "id": "3985"
    },
    "pharaoh-exchange": {
        parentId: "Pharaoh Exchange",
        "id": "3921"
    },
    "kim-exchange-v3": {
        parentId: "KIM Exchange",
        "id": "4299"
    },
    "cauldron": {
        id: "3993",
    },
    "blitz": {
        id: "4214",
        protocolsData: {
            "swap": {
                "id": "5127",
            }
        }
    },
    "warpgate": {
        "id": "4342",
    },
    "swop": {
        id: "613"
    },
    "javsphere": {
        id: "4366"
    },
    "keller": {
        parentId: "Keller Finance",
        id: "4388"
    },
    "savmswap": {
        id: "4422"
    },
    "hbarsuite-dex": {
        id: "4467",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1712793600": true
            }
        }
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
    "hercules": {
        parentId: "Hercules",
        id: "4372",
    },
    "hercules-v3": {
        parentId: "Hercules",
        id: "4373",
        enabled: true
    },
    "zklite": {
        id: "4519"
    },
    "helix-markets": {
        id: "4521"
    },
    "revoswap": {
        id: "4510"
    },
    "glowswap": {
        id: "4515"
    },
    "merlinswap": {
        id: "4191"
    },
    "myswap-cl": {
        parentId: "mySwap",
        id: "3887"
    },
    "meteora": {
        parentId: "Meteora",
        id: "385",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1714867200": true,
                "1714953600": true,
            }
        }
    },
    "nlx": {
        id: "4568",
        protocolsData: {
            "nlx-swap": {
                "id": "4568",
            }
        }
    },
    "fenix-finance": {
        parentId: "Fenix Finance",
        id: "4563"
    },
    "nuri-exchange-v1": {
        parentId: "Nuri Exchange",
        id: "4564"
    },
    "nuri-exchange-v2": {
        parentId: "Nuri Exchange",
        id: "4565"
    },
    "apestore": {
        id: "4584"
    },
    "cropper-clmm": {
        parentId: "Cropper",
        id: "4604",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1715731200": true,
            }
        }
    },
    "mangrove": {
        id: "4610"
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
    "macaron-xyz": {
        id: "4590"
    },
    "ston": {
        id: "2337",
        cleanRecordsConfig: {
            genuineSpikes: {
                1704931200: false
            }
        }
    },
    "keller-cl": {
        parentId: "Keller Finance",
        id: "4583"
    },
    "dragonswap-sei": {
        parentId: "Dragon Swap",
        id: "4720"
    },
    "basin": {
        id: "4703",
        protocolsData: {
            "spot": {
                "id": "4703",
            }
        }
    },
    "polkadex": {
        id: "4699"
    },
    "nostra-pools": {
        parentId: "Nostra",
        id: "4053"
    },
    "clober-v2": {
        parentId: "Clober",
        id: "4764"
    },
    "bladeswap": {
        parentId: "BladeSwap",
        id: "4206",
        protocolsData: {
            "v2": {
                "id": "4206",
            },
            "CL": {
                "id": "4746",
            }
        }
    },
    "stabble": {
        id: "4734"
    },
    "aktionariat": {
        id: "2782"
    },
    "xei": {
        id: "4836"
    },
    "eddyfinance-v2": {
        id: "4120"
    },
    "dedust": {
        id: "2617",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1721606400": true,
            }
        }
    },
    "kriya-clmm": {
        parentId: "Kriya",
        id: "4895"
    },
    "yakafinance": {
        id: "4871"
    },
    "spacewhale": {
        id: "4930"
    },
    "saturnswap": {
        id: "4946"
    },
    "astrolescent": {
        id: "3897"
    },
    "oraidex-v3": {
        id: "5000"
    },
    "c3-exchange": {
        id: "4670"
    },
    "pendle": {
        id: "382"
    },
    "seiyan-fun": {
        id: "5019"
    },
    "aqua-network": {
        id: "5035"
    },
    "chainflip": {
        id: "3853"
    },
    "torch": {
        id: "5096"
    },
    "delta-trade": {
        id: "5050"
    },
    "fwx-dex": {
        parentId: "FWX",
        id: "4962"
    },
    "koi-finance-cl": {
        parentId: "Koi Finance",
        id: "4678"
    },
    "gaspump": {
        id: "5094"
    },
    "predict-fun": {
        id: "5129"
    },
    "pear-protocol": {
        id: "5151"
    },
    "sparkdex-v3": {
        parentId: "SparkDEX",
        id: "4888",
        protocolsData: {
            "v3": {
                "id": "4888",
            }
        }
    },
    "sharpe-dex": {
        id: "2756"
    },
    "bluemove": {
        parentId: "BlueMove",
        id: "2941"
    },
    "h2-finance": {
        parentId: "H2 Finance",
        id: "5017"
    },
    "h2-finance-v3": {
        parentId: "H2 Finance",
        id: "5018"
    },
    "harmony-swap": {
        id: "5198"
    },
    "sparkdex-v3-1": {
        parentId: "SparkDEX",
        id: "5223",
        protocolsData: {
            "v3": {
                "id": "5223",
            }
        }
    },
    "sparkdex-v2": {
        parentId: "SparkDEX",
        id: "4887",
    },
    "mitte": {
        id: "5228"
    },
    "raindex": {
        id: "5221"
    },
    "pixelswap": {
        id: "5119"
    },
    "grafun": {
        id: "5195"
    },
    "cytoswap": {
        id: "5205"
    },
    "polymarket": {
        id: "711"
    },
    "linehub-v2": {
        parentId: "LineHub",
        id: "4660"
    },
    "quickswap-hydra": {
        parentId: "QuickSwap",
        id: "5187"
    },
    "meridian-swap": {
        id: "5025"
    },
    "mira-ly": {
        id: "5252"
    },
    "fenix-finance-v3": {
        parentId: "Fenix Finance",
        id: "4775"
    },
    "kinetix-v2": {
        parentId: "Kinetix",
        id: "3533"
    },
    "metavault-amm-v2": {
        parentId: "MetaVault",
        id: "5186"
    },
    "dexter-tezos": {
        id: "3040"
    },
    "cables": {
        id: "5291"
    },
    "deepbookv3-sui": {
        parentId: "DeepBook",
        id: "5296"
    },
    "kyex": {
        id: "5310"
    },
    "fluid-dex": {
        parentId: "Fluid",
        id: "5317"
    },
    "dragonswap-sei-v3": {
        parentId: "Dragon Swap",
        id: "5066"
    },
    "morFi": {
        id: "5307"
    },
    "assetchain-swap": {
        id: "5324"
    },
    "velocimeter-v4": {
        parentId: "Velocimeter",
        id: "5243"
    },
    "pearl-v1-5": {
        parentId: "PearlFi",
        id: "5308"
    },
    "pearl-v2": {
        parentId: "PearlFi",
        id: "4668"
    },
    "solar-studios": {
        id: "5346"
    },
    "manifest-trade": {
        id: "5349"
    },
    "shido-dex": {
        id: "5366"
    },
    "elexium": {
        id: "5357"
    },
    "spark": {
        id: "5352"
    },
    "mach": {
        id: "5399"
    },
    "ninjablaze": {
        id: "5400"
    },
    "memecooking": {
        id: "5185"
    },
    "pumpfun": {
        id: "4449",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1732492800": true,
                "1732406400": true,
                "1732320000": true,
            }
        }
    },
    "catton": {
        id: "5409"
    },
    "9mm-v2": {
        id: "5416"
    },
    "9mm": {
        id: "5417"
    },
    "catalist-dex": {
        id: "5412"
    },
    "hydrometer": {
        id: "5423",
    },
    "bluefin-amm": {
        id: "5427",
        parentId: "Bluefin",
        protocolsData: {
            "dexes": {
                id: "5427"
            }
        }
    },
    "taraswap": {
        id: "5437",
    },
    "wagmi_ton": {
        id: "5436",
    },
    "bigpump": {
        id: "5443",
    },
    "pinto": {
        id: "5458"
    },
    "blum": {
        id: "5451"
    },
    "trado-spot": {
        id: "5225"
    },
    "balancer-v3": {
        parentId: "Balancer",
        id: "5491"
    },
    "plunderswap": {
        parentId: "PlunderSwap",
        id: "3840"
    },
    "hyperliquid-spot": {
        parentId: "Hyperliquid",
        id: "5761"
    },
    "neby-dex": {
        id: "5512"
    },
    "mantis": {
        id: "5514"
    },
    "utyabswap": {
        id: "5508"
    },
    "vinuswap": {
        id: "5497"
    },
    "emojicoin": {
        id: "5454"
    },
    "datadex": {
        id: "5524"
    },
    "goblin-dex": {
        id: "5531"
    },
    "invariant": {
        id: "1788"
    },
    "rabbitswap-v3": {
        id: "5298"
    },
    "dappos-intentEx": {
        id: "5597",
    },
    "mento": {
        id: "504",
    },
    "sonic-market-cpmm": {
        parentId: "Sonic Market",
        id: "5521",
    },
    "sonic-market-orderbook": {
        parentId: "Sonic Market",
        id: "5522",
    },
    "vinunft": {
        id: "5613",
    },
    "lnexchange-spot": {
        id: "5638",
    },
    "sologenic": {
        id: "5644",
    },
    "meteora-dlmm": {
        parentId: "Meteora",
        id: "4148",
    },
    "metastable-musd": {
        id: "5645"
    },
    "infinityPools": {
        id: "5662"
    },
    "amped": {
        id: "3833",
        protocolsData: {
            "swap": {
                id: "3833",
            }
        }
    },
    "ocelex": {
        parentId: "Ocelex",
        id: "5379"
    },
    "bunni-v2": {
        parentId: "Timeless",
        id: "5734"
    },
    "wavex": {
        id: "5737",
        protocolsData: {
            "swap": {
                id: "5737",
            }
        }
    },
    "penumbra-dex": {
        id: "5739",
    },
    "berachain-hub": {
        id: "5742"
    },
    "uniswap-v4": {
        id: "5690"
    },
    "bitflow-fi": {
        id: "4136"
    },
    "velar": {
        id: "4339"
    },
    "storyhunt-v3": {
        id: "5781"
    },
    "kittypunch": {
        id: "5203"
    },
    "four-meme": {
        id: "5174"
    },
    "pulsex-stableswap": {
        parentId: "PulseX",
        id: "5795",
    },
    "sailor-finance": {
        id: "5647",
    },
    "kodiak-v2": {
        id: "5743",
    },
    "silverswap": {
        id: "5529",
    },
    "olab": {
        id: "5648",
    },
    "bullaexchange": {
        id: "5766",
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
    "piperx-v2": {
        id: "5779",
    },
    "piperx-v3": {
        id: "5780",
    },
    "magma-finance": {
        id: "5774",
    },
    "caviarnine-simplepool": {
        id: "5064",
    },
    "xpress": {
        id: "5686"
    },
    "burrbear": {
        id: "5745"
    },
    "fibonacci-dex": {
        id: "5832"
    },
    "bitflux": {
        id: "5344"
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
    "hyperion": {
        id: "5480"
    },
    "metropolis-amm": {
        id: "5504"
    },
    "metropolis-dlmm": {
        id: "5505"
    },
    "enosys": {
        id: "5158"
    },
    "tea-fi": {
        id: "5875"
    },
    "beets-v3": {
        id: "5680"
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
    "yuzu-finance": {
        "id": "5906"
    },
    "rfx": {
        id: "5406",
        protocolsData: {
            "rfx-swap": {
                id: "5406"
            }
        }
    },
    "tonco": {
        id: "5363"
    },
    "ekubo-evm": {
        id: "5914"
    },
    "equalizer-cl": {
        id: "5603"
    },
    "xswap-v3": {
        id: "3914"
    },
    "unchain-x": {
        id: "5917"
    },
    "pump-swap": {
        id: "5936"
    },
    "steamm": {
        id: "5824"
    },
    "umbra": {
        id: "5943"
    },
    "squadswap-dynamo": {
        id: "5921"
    },
    "squadswap-wow": {
        id: "5922"
    },
    "gacha": {
        id: "5942"
    },
    "kittypunch-stable": {
        id: "5790"
    },
    "saucerswap-v2": {
        id: "5966"
    },
    "justbet": {
        id:"5950"
    },
    "katana-v3": {
        id: "5972"
    },
    "sandglass": {
        id: "5965"
    },
    "syncswap-v3": {
        id: "5982"
    },
    "verus": {
        id: "5601" 
    },
    "haedal": {
        id: "5784"
    },
    "hardswap": {
        id: "5999"
    },
    "momentum": {
        id: "6005"
    },
    "jup-ape": {
        id: "4860"
    },
    "sonex": {
        id: "5640"
    },
    "kyo-fi-v3": {
        id: "5622"
    },
    "kongswap": {
        id: "5528"
    }
} as AdaptorsConfig
