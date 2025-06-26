import { AdaptorsConfig } from "../types"

export default {
    "champagneswap": {
        disabled: true,
        id: "1643"
    },
    "katana": {
        id: "797"
    },
    // "pancakeswap": { // moved to protocol/config.ts
    //     id: "194",
    //     parentId: "PancakeSwap",
    //     protocolsData: {
    //         v1: {
    //             "disabled": true,
    //             id: "2590"
    //         },
    //         v2: {
    //             id: "194"
    //         },
    //         stableswap: {
    //             id: "2529",
    //             startFrom: 1663718400
    //         },
    //         v3: {
    //             id: "2769"
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
        id: "214",
        cleanRecordsConfig: {
            genuineSpikes: {
                1685318400: false
            }
        }
    },
    // "uniswap": {  // moved to protocol/config.ts
    //     id: "1",
    //     parentId: "Uniswap",
    //     "protocolsData": {
    //         "v1": {
    //             id: "2196"
    //         },
    //         "v2": {
    //             id: "2197"
    //         },
    //         "v3": {
    //             id: "2198"
    //         },
    //     },
    //     cleanRecordsConfig: {
    //         genuineSpikes: {
    //             1665446400: true
    //         }
    //     }
    // },
    "spookyswap": {
        id: "302"
    },
    "spiritswap": {
        parentId: "SpiritSwap",
        id: "311"
    },
    "soulswap": {
        id: "544"
    },
    "klayswap": {
        id: "508"
    },
    "osmosis": {
        id: "383"
    },
    "serum": {
        disabled: true,
        id: "145"
    },
    "curve": {
        id: "3"
    },
    "mooniswap": {
        id: "1053"
    },
    "dodo": {
        id: "146"
    },
    "velodrome": {
        parentId: "Velodrome",
        id: "1799"
    },
    "woofi": {
        parentId: "WOOFi",
        id: "1461"
    },
    "hashflow": {
        id: "1447"
    },
    "zipswap": {
        id: "1296"
    },
    "wardenswap": {
        id: "392"
    },
    "ref-finance": {
        id: "541"
    },
    "solidly": {
        parentId: "Solidly Labs",
        id: "1407"
    },
    "orca": {
        id: "283"
    },
    "saber": {
        id: "419"
    },
    "platypus": {
        disabled: true,
        id: "944",
        cleanRecordsConfig: {
            genuineSpikes: {
                1697068800: false
            }
        }
    },
    "yoshi-exchange": {
        id: "863"
    },
    "biswap": {
        parentId: "BiSwap",
        id: "373"
    },
    "apeswap": {
        parentId: "ApeSwap",
        id: "398"
    },
    "pangolin": {
        id: "246"
    },
    "minswap": {
        id: "1494"
    },
    "wingriders": {
        id: "1601"
    },
    "wombat-exchange": {
        id: "1700"
    },
    "dfyn": {
        id: "318"
    },
    "flamingo-finance": {
        id: "304"
    },
    "0x-rfq": {
        id: "2116",
    },
    "baryon": {
        id: "1950"
    },
    "cherryswap": {
        id: "543"
    },
    "clipper": {
        id: "622"
    },
    "cryptoswap": {
        id: "1750"
    },
    "ellipsis": {
        id: "238"
    },
    "klex-finance": {
        disabled: true,
        id: "2049"
    },
    "koyo": {
        disabled: true,
        id: "1766"
    },
    "pyeswap": {
        disabled: true,
        id: "2109"
    },
    "sunswap": {
        parentId: "SUN.io",
        id: "690",
        cleanRecordsConfig: {
            genuineSpikes: {
                1689984000: false
            }
        }
    },
    "whaleswap": {
        disabled: true,
        id: "1884"
    },
    "nomiswap": {
        "enabled": false,
        id: "1823"
    },
    "beethoven-x": {
        parentId: "Beethoven X",
        id: "654"
    },
    "defi-swap": {
        id: "221",
        cleanRecordsConfig: {
            genuineSpikes: {
                1683676800: false,
                1700524800: true
            }
        }
    },
    "wanswap-dex": {
        id: "186"
    },
    "solarbeam": {
        id: "551"
    },
    "tomb-swap": {
        parentId: "Tomb Finance",
        id: "2129"
    },
    "dfx-finance": {
        id: "366"
    },
    "frax-swap": {
        parentId: "Frax Finance",
        id: "2121"
    },
    "iziswap": {
        parentId: "iZUMI Finance",
        id: "1883",
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
        id: "680"
    },
    "junoswap": {
        disabled: true,
        id: "2052"
    },
    "knightswap-finance": {
        id: "942"
    },
    "mdex": {
        id: "334"
    },
    "meshswap": {
        id: "1726"
    },
    "mm-stableswap-polygon": {
        parentId: "MM Finance",
        id: "2015"
    },
    "radioshack": {
        id: "1616"
    },
    "mojitoswap": {
        id: "1181"
    },
    "yieldfields": {
        id: "1347"
    },
    "terraswap": {
        disabled: true,
        id: "491"
    },
    "saros": {
        disabled: true,
        id: "1262"
    },
    "vvs-finance": {
        id: "831"
    },
    "shibaswap": {
        id: "397"
    },
    "viperswap": {
        disabled: true,
        id: "313"
    },
    "oolongswap": {
        id: "794"
    },
    "swapr": {
        id: "292"
    },
    "cone": {
        id: "1970"
    },
    "claimswap": {
        id: "1455"
    },
    "spartacus-exchange": {
        id: "1755"
    },
    "openleverage": {
        id: "1208"
    },
    "ubeswap": {
        id: "488",
        cleanRecordsConfig: {
            genuineSpikes: {
                1675555200: true
            }
        }
    },
    "mobius-money": {
        id: "588"
    },
    "honeyswap": {
        id: "271"
    },
    "energiswap": {
        id: "242"
    },
    "stellaswap": {
        id: "1274"
    },
    "wagyuswap": {
        disabled: true,
        id: "1003"
    },
    "dystopia": {
        id: "1756"
    },
    "glide-finance": {
        id: "806"
    },
    "quipuswap": {
        id: "513"
    },
    "netswap": {
        id: "1140"
    },
    "astroport": {
        disabled: true,
        id: "1052"
    },
    "tethys-finance": {
        parentId: "Tethys Finance",
        id: "1139"
    },
    "mimo": {
        disabled: true,
        id: "1241"
    },
    "kaidex": {
        id: "712"
    },
    "lif3-swap": {
        parentId: "Lif3.com",
        id: "2040"
    },
    "swappi": {
        id: "1660"
    },
    "yodeswap": {
        disabled: true,
        id: "1980"
    },
    "defi-kingdoms": {
        disabled: true,
        id: "556",
        cleanRecordsConfig: {
            genuineSpikes: {
                1656028800: false
            }
        }
    },
    "defiplaza": {
        id: "728"
    },
    "polycat": {
        parentId: "Polycat Finance",
        id: "499"
    },
    "yokaiswap": {
        id: "1002"
    },
    "protofi": {
        id: "1306"
    },
    "voltage": {
        id: "714"
    },
    "complus-network": {
        id: "471"
    },
    "padswap": {
        id: "644"
    },
    "sharkswap": {
        id: "1828"
    },
    "okcswap": {
        id: "2099"
    },
    "empiredex": {
        id: "812"
    },
    "makiswap": {
        disabled: true,
        id: "378"
    },
    "smartdex": {
        id: "883"
    },
    "cometh": {
        id: "261"
    },
    "xexchange": {
        id: "854"
    },
    "defichain-dex": {
        id: "1166"
    },
    "blue-planet": {
        parentId: "Planet",
        id: "2158"
    },
    "aldrin": {
        disabled: true,
        id: "739"
    },
    "capricorn-finance": {
        disabled: true,
        id: "2128"
    },
    "alex": {
        id: "1466"
    },
    "step-exchange": {
        id: "2312"
    },
    "pegasys": {
        parentId: "PegaSys",
        id: "1432"
    },
    "crodex": {
        disabled: true,
        id: "828"
    },
    "babyswap": {
        id: "597",
        cleanRecordsConfig: {
            genuineSpikes: {
                1705881600: false,
                1712880000: false
            }
        }
    },
    "lifinity": {
        id: "2154"
    },
    "vanswap": {
        id: "2066"
    },
    "dao-swap": {
        parentId: "DAO Maker",
        id: "2167"
    },
    "jswap": {
        disabled: true,
        id: "678"
    },
    "babydogeswap": {
        id: "2169",
        cleanRecordsConfig: {
            genuineSpikes: {
                1685232000: false,
                1687305600: false
            }
        }
    },
    "wigoswap": {
        id: "1351"
    },
    "levinswap": {
        id: "299"
    },
    "templedao-trade": {
        parentId: "Temple DAO",
        id: "2178"
    },
    "karura-swap": {
        id: "451"
    },
    "sphynx": {
        id: "1992"
    },
    "kuswap": {
        id: "480"
    },
    "paint-swap": {
        id: "421"
    },
    "benswap": {
        id: "749"
    },
    "bogged-finance": {
        "enabled": false,
        id: "617"
    },
    "jetswap": {
        id: "659"
    },
    "saucerswap": {
        id: "1979"
    },
    "synthetify": {
        id: "731"
    },
    "pandora": {
        id: "1698"
    },
    "paycash": {
        id: "1452"
    },
    "soy-finance": {
        id: "1008"
    },
    "photonswap-finance": {
        disabled: true,
        id: "847"
    },
    "alita-finance": {
        id: "561"
    },
    "unifi": {
        id: "646"
    },
    "wineryswap": {
        disabled: true,
        id: "2118"
    },
    "huckleberry": {
        parentId: "Huckleberry",
        id: "630"
    },
    "hakuswap": {
        id: "1253"
    },
    "leonicornswap": {
        id: "923"
    },
    "autoshark": {
        id: "1074"
    },
    "saddle-finance": {
        id: "202"
    },
    "titano-swych": {
        id: "2102"
    },
    // "stellarx": {
    //     id: "972"
    // },
    "ultronswap": {
        id: "2032"
    },
    "humble-defi": {
        id: "1629"
    },
    "pact": {
        id: "1468"
    },
    "algofi": {
        parentId: "Algofi",
        disabled: true,
        id: "2091"
    },
    "elk": {
        id: "420"
    },
    "luaswap": {
        id: "707"
    },
    "unicly": {
        disabled: true,
        id: "324"
    },
    "crema-finance": {
        id: "1412"
    },
    "icecreamswap": {
        parentId: "IcecreamSwap",
        disabled: true,
        id: "1990"
    },
    "arctic": {
        "enabled": false,
        id: "2176"
    },
    "swapsicle": {
        "enabled": false,
        id: "1824"
    },
    "morpheus-swap": {
        id: "581"
    },
    "fairyswap": {
        parentId: "FairySwap",
        disabled: true,
        id: "1671"
    },
    "moon-swap": {
        id: "1942"
    },
    "fx-swap": {
        id: "2138"
    },
    "pinkswap": {
        id: "367"
    },
    "spartan": {
        id: "1246"
    },
    "penguin": {
        id: "1575"
    },
    "vortex-protocol": {
        "enabled": false,
        id: "1706"
    },
    "dinosaur-eggs": {
        id: "695"
    },
    "mcdex": {
        "enabled": false,
        id: "232"
    },
    "mistswap": {
        disabled: true,
        id: "748"
    },
    "bxh": {
        id: "404"
    },
    "auraswap": {
        id: "1859"
    },
    "carbonswap": {
        id: "670"
    },
    "pangea-swap": {
        id: "1987"
    },
    "gravity-finance": {
        id: "351"
    },
    "4swap": {
        parentId: "Pando",
        disabled: true,
        id: "951"
    },
    "gravis": {
        id: "2195"
    },
    "tetu": {
        parentId: "parent#tetu",
        id: "2203"
    },
    "muesliswap": {
        id: "747"
    },
    "gin-finance": {
        id: "1795"
    },
    "ferro": {
        id: "1882"
    },
    "increment-swap": {
        parentId: "incrementFinance",
        id: "1907"
    },
    "chainge-finance": {
        id: "704"
    },
    "minerswap": {
        "enabled": false,
        id: "2233"
    },
    "wavelength-dao": {
        id: "2220"
    },
    "thorswap": {
        id: "412"
    },
    "metatdex": {
        id: "2253"
    },
    "3xcalibur": {
        id: "2283"
    },
    "kava-swap": {
        id: "618"
    },
    "emdx": {
        "enabled": false,
        id: "2299"
    },
    "cetus": {
        id: "2289",
    },
    "opx-finance": {
        id: "2256"
    },
    "camelot": {
        parentId: "Camelot",
        id: "2307"
    },
    "openbook": {
        id: "2322"
    },
    "ghostmarket": {
        "enabled": false,
        id: "2290"
    },
    "synfutures": {
        "enabled": false,
        id: "2328"
    },
    "xswap-protocol": {
        id: "2145"
    },
    "kperp-exchange": {
        "enabled": false,
        id: "2326"
    },
    "jojo": {
        "enabled": false,
        id: "2320"
    },
    "10kswap": {
        id: "2345"
    },
    "solarflare": {
        id: "1269"
    },
    "sundaeswap": {
        id: "1302"
    },
    "wx.network": {
        "enabled": false,
        id: "614"
    },
    "myswap": {
        parentId: "mySwap",
        id: "2367"
    },
    "liquidswap": {
        id: "2210"
    },
    "rubicon": {
        id: "799"
    },
    "aux-exchange": {
        id: "2213"
    },
    "wojak-finance": {
        disabled: true,
        id: "2113"
    },
    "ampleswap": {
        id: "2383"
    },
    "heliswap": {
        id: "2244"
    },
    "wingswap": {
        id: "976"
    },
    "zircon-gamma": {
        disabled: true,
        id: "2143"
    },
    "lumenswap": {
        id: "882"
    },
    "mummy-finance": {
        id: "2361"
    },
    "hyperjump": {
        id: "317"
    },
    "kokonut-swap": {
        id: "1790"
    },
    "syrup-finance": {
        disabled: true,
        id: "2401"
    },
    "axial": {
        disabled: true,
        id: "845"
    },
    "exinswap": {
        id: "1179"
    },
    "darkness": {
        disabled: true,
        id: "1555"
    },
    "zilswap": {
        id: "303"
    },
    "thena": {
        name: "Thena V1",
        displayName: "Thena V1",
        id: "2417"
    },
    "ttswap": {
        id: "705"
    },
    "aequinox": {
        disabled: true,
        id: "2090"
    },
    "vexchange": {
        id: "963"
    },
    "metropolis": {
        disabled: true,
        id: "2452"
    },
    "verse": {
        id: "1732"
    },
    "equalizer-exchange": {
        parentId: "Equalizer",
        id: "2332"
    },
    "canto-dex": {
        id: "1985"
    },
    "solidlydex": {
        parentId: "Solidly Labs",
        id: "2400"
    },
    "defibox": {
        id: "507"
    },
    "shell-protocol": {
        id: "133"
    },
    "archly-finance": {
        parentId: "Archly Finance",
        id: "2317"
    },
    "hermes-protocol": {
        id: "1384"
    },
    "hiveswap": {
        parentId: "HiveSwap",
        id: "2485"
    },
    "plenty": {
        id: "490"
    },
    "jediswap": {
        parentId: "JediSwap",
        "enabled": false,
        id: "2344"
    },
    "solidlizard": {
        id: "2528"
    },
    "onepunch": {
        disabled: true,
        id: "2534"
    },
    "thorwallet": {
        "enabled": false,
        id: "2533"
    },
    "ashswap": {
        id: "2551"
    },
    "veniceswap": {
        disabled: true,
        id: "2550"
    },
    "oraidex": {
        id: "2564"
    },
    "subzero-zswap": {
        id: "2556"
    },
    "megaton-finance": {
        id: "2540"
    },
    "bakeryswap": {
        "enabled": false,
        id: "602"
    },
    "bisq": {
        id: "2588"
    },
    "dexalot": {
        id: "2589"
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
        id: "2731"
    },
    "hadouken-amm": {
        parentId: "Hadouken Finance",
        id: "2748"
    },
    "acala-swap": {
        id: "1847"
    },
    "maia-v3": {
        id: "2760"
    },
    "kyotoswap": {
        id: "2350"
    },
    "SmarDex": {
        id: "2695"
    },
    "mm-finance-arbitrum": {
        parentId: "MM Finance",
        id: "2754"
    },
    "native": {
        id: "2803"
    },
    "camelot-v3": {
        parentId: "Camelot",
        id: "2792"
    },
    "satoshiswap": {
        disabled: true,
        id: "2827"
    },
    "wagmi": {
        id: "2837"
    },
    "auragi": {
        id: "2773"
    },
    "polkaswap": {
        id: "713"
    },
    "thena-v3": {
        parentId: "Thena",
        id: "2864"
    },
    "astroswap": {
        disabled: true,
        id: "1368"
    },
    "merlin": {
        id: "2849"
    },
    "tealswap": {
        id: "2874"
    },
    "pheasantswap": {
        id: "2896"
    },
    "velocimeter-v2": {
        parentId: "Velocimeter",
        id: "2668"
    },
    "joe-v2.1": {
        parentId: "Trader Joe",
        id: "2906",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1682899200": true,
                "1682812800": true
            },
        }
    },
    "chronos": {
        id: "2907"
    },
    "stellaswap-v3": {
        id: "2934"
    },
    "e3": {
        id: "2926"
    },
    "clober": {
        parentId: "Clober",
        id: "2541"
    },
    "airswap": {
        id: "2954"
    },
    "lighter": {
        parentId: "Lighter",
        disabled: true,
        id: "2636"
    },
    "veax": {
        id: "2928"
    },
    "dpex": {
        id: "2488"
    },
    "forge": {
        id: "2804"
    },
    "interest-protocol": {
        "enabled": false,
        id: "3015"
    },
    "fxdx": {
        id: "3036"
    },
    "sunswap-v2": {
        parentId: "SUN.io",
        id: "3005"
    },
    "pulsex-v1": {
        parentId: "PulseX",
        id: "2995",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1686009600": true,
            },
        }
    },
    "pulsex-v2": {
        parentId: "PulseX",
        id: "3060",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1686009600": true,
            },
        }
    },
    "fathom-dex": {
        id: "3077"
    },
    "heraswap": {
        id: "3089"
    },
    "miaswap": {
        id: "3090"
    },
    "hummus": {
        disabled: true,
        id: "1715"
    },
    "tokenlon-dex": {
        id: "405",
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
        id: "2809",
    },
    "litx": {
        disabled: true,
        id: "3159"
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
        id: "3172"
    },
    "icpswap": {
        id: "3257"
    },
    "echodex": {
        parentId: "EchoDEX",
        id: "3256"
    },
    "reax-one-dex": {
        id: "3260"
    },
    "deepbook-sui": {
        parentId: "DeepBook",
        id: "3268",
        cleanRecordsConfig: {
            genuineSpikes: {
                1706659200: false
            }
        }
    },
    "agni-fi": {
        id: "3265"
    },
    "horizondex": {
        id: "3255"
    },
    "velodrome-v2": {
        parentId: "Velodrome",
        id: "3302",
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
        id: "3246"
    },
    "crescent-swap": {
        id: "3315"
    },
    "brine": {
        id: "3316"
    },
    "velocore-v2": {
        id: "3330"
    },
    "syncswap": {
        id: "2728",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1748390400": true
            },
        }
    },
    "echodex-v3": {
        parentId: "EchoDEX",
        id: "3349"
    },
    "fcon-dex": {
        disabled: true,
        id: "3299"
    },
    "throne-v3": {
        id: "3382",
        parentId: "Throne"
    },
    "dackieswap": {
        parentId: "DackieSwap",
        id: "3345",
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
        id: "3408"
    },
    "hydradx": {
        id: "3439"
    },
    "yfx-v3": {
        id: "3429"
    },
    "danogo": {
        id: "3454"
    },
    "spicyswap": {
        id: "1029"
    },
    "dackieswap-v2": {
        parentId: "DackieSwap",
        id: "3515",
    },
    "sithswap": {
        id: "2719"
    },
    "ekubo": {
        id: "3499"
    },
    "chronos-v2": {
        id: "3341"
    },
    "solidly-v3": {
        parentId: "Solidly Labs",
        id: "3481"
    },
    "tegro": {
        id: "3561"
    },
    "Scale": {
        parentId: "Equalizer",
        id: "3575"
    },
    "fvm-exchange": {
        parentId: "Velocimeter",
        id: "3291"
    },
    "xena-finance": {
        id: "3620"
    },
    "spectrum": {
        id: "1088"
    },
    "turbos": {
        id: "2940",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1697328000": true,
            },
        }
    },
    "tangleswap": {
        id: "3585"
    },
    "dx25": {
        id: "3650"
    },
    "shimmersea": {
        parentId: "MagicSea",
        id: "3571"
    },
    "kriya-dex": {
        id: "2939"
    },
    "primex-finance": {
        id: "3664"
    },
    "candyswap": {
        id: "3682"
    },
    "luigiswap": {
        id: "3415"
    },
    "kinetix-v3": {
        parentId: "Kinetix",
        id: "3534",
    },
    "caviarnine-orderbook": {
        id: "3645",
    },
    "kinetix-derivative": {
        parentId: "Kinetix",
        id: "3465"
    },
    "retro": {
        id: "3311"
    },
    "metavault-v3": {
        parentId: "Metavault",
        "enabled": false,
        id: "3750",
    },
    "elektrik": {
        id: "3773"
    },
    "caviarnine-lsu-pool": {
        id: "3666"
    },
    "chimpexchange": {
        id: "3836"
    },
    "lighterv2": {
        parentId: "Lighter",
        "enabled": false,
        id: "3854"
    },
    "thick": {
        id: "3878"
    },
    "noah-swap": {
        id: "2855"
    },
    "pegasys-v3": {
        parentId: "PegaSys",
        id: "3178"
    },
    "canary": {
        id: "474"
    },
    "xfai": {
        id: "3816"
    },
    "zebra-v1": {
        parentId: "Zebra",
        id: "3668"
    },
    "zebra-v2": {
        parentId: "Zebra",
        id: "3901"
    },
    "astroport-v2": {
        id: "3117"
    },
    "kizuna": {
        parentId: "KIM Exchange",
        id: "3913"
    },
    "butterxyz": {
        id: "3918"
    },
    "phoenix": {
        displayName: "Phoenix",
        id: "3170",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1722816000": true,
            }
        }
    },
    "ryze": {
        id: "3907"
    },
    "beamswap-v3": {
        id: "3092",
    },
    "aftermath-fi-amm": {
        parentId: "Aftermath Finance",
        id: "3259"
    },
    "sanctum": {
        id: "3388",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1704240000": true,
            },
        }
    },
    "jibswap": {
        id: "3928"
    },
    "zkswap": {
        id: "3280",
        cleanRecordsConfig: {
            genuineSpikes: {
                1703203200: false,
                1704672000: false
            }
        }
    },
    "trisolaris": {
        id: "784"
    },
    "nearpad": {
        id: "953"
    },
    "auroraswap": {
        id: "1174"
    },
    "wannaswap": {
        id: "980"
    },
    "allbridge-classic": {
        id: "577",
        cleanRecordsConfig: {
            genuineSpikes: {
                1747872000: true
            }
        }
    },
    "monocerus": {
        id: "3622"
    },
    "sunswap-v3": {
        parentId: "SUN.io",
        id: "4031"
    },
    "squadswap-v2": {
        parentId: "SquadSwap",
        id: "4009"
    },
    "squadswap-v3": {
        parentId: "SquadSwap",
        id: "4010"
    },
    "ICDex": {
        id: "4040"
    },
    "horiza": {
        id: "4041"
    },
    "starkdefi": {
        id: "3880",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1707177600": true,
            },
        }
    },
    "hiveswap-v3": {
        parentId: "HiveSwap",
        id: "4113"
    },
    "supswap-v2": {
        parentId: "SupSwap",
        id: "4117"
    },
    "supswap-v3": {
        parentId: "SupSwap",
        id: "4118"
    },
    "econia": {
        id: "4128"
    },
    "symmetric": {
        id: "528",
    },
    "Omnidrome": {
        id: "4119"
    },
    "jediswap-v2": {
        parentId: "JediSwap",
        id: "4144"
    },
    "swapsicle-v2": {
        parentId: "Swapsicle",
        id: "3716"
    },
    "merchant-moe": {
        parentId: "Merchant Moe",
        id: "4006"
    },
    "deltaswap": {
        parentId: "GammaSwap Protocol",
        id: "4062"
    },
    "lynex-v1": {
        parentId: "Lynex",
        id: "3908"
    },
    // "Scopuly": {
    //     id: "4181"
    // },
    "standard-mode": {
        id: "4186"
    },
    "sushi-aptos": {
        parentId: "Sushi",
        id: "3827"
    },
    "cellana-finance": {
        id: "4194",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1747785600": true,
                "1748476800": true,
            }
        }
    },
    "nile-exchange": {
        parentId: "Nile Exchange",
        id: "4072"
    },
    "nile-exchange-v1": {
        parentId: "Nile Exchange",
        id: "4285"
    },
    "archly-finance-v2": {
        parentId: "Archly Finance",
        id: "3940",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1710288000": true
            }
        }
    },
    "cleopatra-exchange": {
        parentId: "Cleopatra Exchange",
        id: "3985"
    },
    "pharaoh-exchange": {
        parentId: "Pharaoh Exchange",
        id: "3921"
    },
    "kim-exchange-v3": {
        parentId: "KIM Exchange",
        id: "4299"
    },
    "cauldron": {
        id: "3993",
    },
    "warpgate": {
        id: "4342",
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
                "1747180800": true
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
        id: "382",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1746230400": true,
            }
        }
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
        id: "4888",
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
        id: "5223",
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
    "ocelex": {
        parentId: "Ocelex",
        id: "5379"
    },
    "bunni-v2": {
        parentId: "Timeless",
        id: "5734"
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
        id: "5906"
    },
    "tonco": {
        id: "5363"
    },
    // "ekubo-evm": { // merged with ekubo : https://github.com/DefiLlama/defillama-server/commit/3aba710f2a43514ddd5c64368670df078144361b
    //     id: "5914"
    // },
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
        id: "5950"
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
    },
    "elys-dex": {
        id: "5544"
    },
    "razordex": {
        id: "6054"
    },
    "tonpump": {
        id: "5468"
    },
    "flowx-v3": {
        id: "4582"
    },
    "zora-sofi": {
        id: "6069"
    },
    "launchlab": {
        id: "6074",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1745539200": true,
            }
        }
    },
    "beezie": {
        id: "6075"
    },
    "kittypunch-v3": {
        id: "6051"
    },
    "sonicxswap": {
        id: "6083"
    },
    "1dex": {
        id: "6003"
    },
    "swaps-io": {
        id: "6092"
    },
    "humanfi": {
        id: "6094"
    },
    "mosaic-amm": {
        id: "6098"
    },
    "goosefx_v2": {
        id: "5998"
    },
    "sanctum-infinity": {
        id: "4368"
    },
    "pepe-dex": {
        id: "6086"
    },
    "boop-fun": {
        id: "6129"
    },
    "pancakeswap-infinity": {
        id: "6133"
    },
    "voltage-v4": {
        id: "5754"
    },
    "initia-dex": {
        id: "6138"
    },
    "titan": {
        id: "6076"
    },
    "yakafinance-v3": {
        id: "6114"
    },
    "arena-dex": {
        id: "6154"
    },
    "arena-launch": {
        id: "6155"
    },
    "believe": {
        id: "6159",
        enabled: false,
    },
    "rockswap": {
        id: "4204"
    },
    "balancer-v1": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1718755200": true,
                "1722297600": true,
                "1722816000": true,
                "1738540800": true
            }
        },
        id: "116",
        "displayName": "Balancer V1"
    },
    "balancer-v2": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1718755200": true,
                "1722297600": true,
                "1722816000": true,
                "1738540800": true
            }
        },
        id: "2611",
        "displayName": "Balancer V2"
    },
    "bancor-v3": {
        id: "1995"
    },
    "bancor-v2_1": {
        id: "162"
    },
    "traderjoe-v1": {
        id: "468"
    },
    "traderjoe-v2": {
        id: "2393"
    },
    "sushiswap-classic": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1712793600": false
            }
        },
        id: "119"
    },
    "sushiswap-trident": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1712793600": false
            }
        },
        id: "2152"
    },
    "sushiswap-v3": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1712793600": false
            }
        },
        id: "2776"
    },
    "gmx-swap": {
        id: "5069",
        "category": "Dexs",
        "displayName": "GMX - SWAP"
    },
    "quickswap-v2": {
        id: "306",
        "displayName": "Quickswap V2"
    },
    "quickswap-v3": {
        id: "2239"
    },
    "quickswap-liquidityHub": {
        id: "3743"
    },
    "kyberswap-classic": {
        id: "127",
        "displayName": "KyberSwap - Classic"
    },
    "kyberswap-elastic": {
        id: "2615",
        "displayName": "KyberSwap - Elastic"
    },
    "smbswap-v2": {
        id: "1632"
    },
    "smbswap-v3": {
        id: "2895"
    },
    "beamswap-classic": {
        id: "1289"
    },
    "beamswap-stable-amm": {
        id: "2596"
    },
    "voltswap-v1": {
        "disabled": true,
        id: "1225",
        "displayName": "VoltSwap V1"
    },
    "voltswap-v2": {
        id: "2133"
    },
    "surfswap-classic": {
        id: "1868"
    },
    "surfswap-stable-amm": {
        id: "2598"
    },
    "orderly-network-orderly-network": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1712188800": false
            }
        },
        id: "5088"
    },
    "vapordex-v1": {
        id: "2342"
    },
    "vapordex-v2": {
        id: "3654"
    },
    "el-dorado-exchange-swap": {
        "disabled": true,
        id: "2356",
        "category": "Dexs",
        "displayName": "El Dorado Exchange - SWAP"
    },
    "level-finance-level-finance": {
        id: "5089"
    },
    "demex-demex": {
        id: "5073"
    },
    "zyberswap-v2": {
        id: "2467"
    },
    "zyberswap-v3": {
        id: "2602"
    },
    "zyberswap-stable": {
        id: "2530"
    },
    "helix-helix": {
        id: "2259"
    },
    "metavault_trade-metavault_trade": {
        id: "5072"
    },
    "morphex-swap": {
        id: "5116",
        "category": "Dexs",
        "displayName": "Morphex - SWAP"
    },
    "spacedex-swap": {
        id: "2814",
        "category": "Dexs",
        "displayName": "SpaceDex - SWAP"
    },
    "covo-v2-swap": {
        "disabled": true,
        id: "2730",
        "category": "Dexs",
        "displayName": "Covo V2 - SWAP",
        "cleanRecordsConfig": {
            "genuineSpikes": true
        }
    },
    "hydradex-v2": {
        "disabled": true,
        id: "1673",
        "displayName": "Hydradex V2"
    },
    "hydradex-v3": {
        id: "2910",
        "displayName": "Hydradex V3"
    },
    "ArbitrumExchange-v2": {
        id: "2685",
        "displayName": "Arbitrum Exchange V2"
    },
    "ArbitrumExchange-v3": {
        id: "2962",
        "displayName": "Arbitrum Exchange V3"
    },
    "vertex-protocol-swap": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1689811200": true
            }
        },
        id: "5117",
        "category": "Dexs"
    },
    "fulcrom-finance-swap": {
        id: "5115",
        "category": "Dexs",
        "displayName": "Fulcrom - SWAP"
    },
    "voodoo-trade-swap": {
        id: "3792",
        "category": "Dexs"
    },
    "pinnako-swap": {
        id: "3209",
        "category": "Dexs"
    },
    "drift-protocol-swap": {
        id: "5071",
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1749081600": true
            }
        },
    },
    "grizzly-trade-swap": {
        "disabled": true,
        id: "5124"
    },
    "ktx-swap": {
        id: "5121"
    },
    "gmx-v2-gmx-v2-swap": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1722902400": true,
                "1722988800": true,
                "1723075200": true
            }
        },
        id: "5070"
    },
    "meridian-trade-swap": {
        "enabled": false,
        id: "3386"
    },
    "baseswap-v2": {
        id: "3333"
    },
    "baseswap-v3": {
        id: "3507"
    },
    "swapbased-v2": {
        id: "3328"
    },
    "swapbased-v3": {
        id: "3409"
    },
    "morphex-old-swap": {
        "disabled": true,
        id: "5125",
        "category": "Dexs"
    },
    "nether-fi-swap": {
        id: "3509",
        "category": "Dexs"
    },
    "bmx-swap": {
        id: "5126",
        "category": "Dexs"
    },
    "mango-v4-spot": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1695081600": true
            }
        },
        id: "5122"
    },
    "blex-volume": {
        id: "3605"
    },
    "derivio-swap": {
        "enabled": false,
        id: "3759"
    },
    "ascent-v2": {
        id: "3867"
    },
    "ascent-v3": {
        id: "3868"
    },
    "swaap-v1": {
        id: "2104"
    },
    "swaap-v2": {
        id: "3218"
    },
    "beamex-beamex-swap": {
        id: "5123"
    },
    "lexer-swap": {
        id: "4087"
    },
    "dragonswap-v2": {
        id: "4138"
    },
    "dragonswap-v3": {
        id: "4139"
    },
    "blitz-swap": {
        id: "5127"
    },
    "fjord-foundry-v2": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1713657600": true,
                "1713744000": true
            }
        },
        id: "4505"
    },
    "fjord-foundry-v1": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1713657600": true,
                "1713744000": true
            }
        },
        id: "4557"
    },
    "nlx-nlx-swap": {
        id: "4568"
    },
    "ociswap-basic": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1715817600": true
            }
        },
        id: "3646"
    },
    "ociswap-precision": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1715817600": true
            }
        },
        id: "4629"
    },
    "bladeswap-v2": {
        id: "4206"
    },
    "bladeswap-CL": {
        id: "4746"
    },
    "amped-swap": {
        id: "3833"
    },
    "wavex-swap": {
        id: "5737"
    },
    "rfx-rfx-swap": {
        id: "5406"
    },
    "uniswap-v1": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1603670400": true,
                "1661990400": true,
                "1665446400": true,
                "1670630400": true,
                "1722816000": true,
                "1725580800": true
            }
        },
        id: "2196"
    },
    "uniswap-v2": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1603670400": true,
                "1661990400": true,
                "1665446400": true,
                "1670630400": true,
                "1722816000": true,
                "1725580800": true
            }
        },
        id: "2197"
    },
    "uniswap-v3": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1603670400": true,
                "1661990400": true,
                "1665446400": true,
                "1670630400": true,
                "1722816000": true,
                "1725580800": true
            }
        },
        id: "2198"
    },
    "pancakeswap-v1": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1660176000": false,
                "1665014400": false,
                "1684713600": false
            }
        },
        "disabled": true,
        id: "2590"
    },
    "pancakeswap-v2": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1660176000": false,
                "1665014400": false,
                "1684713600": false
            }
        },
        id: "194"
    },
    "pancakeswap-stableswap": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1660176000": false,
                "1665014400": false,
                "1684713600": false,
                "1747612800": true
            }
        },
        id: "2529"
    },
    "pancakeswap-v3": {
        "cleanRecordsConfig": {
            "genuineSpikes": {
                "1660176000": false,
                "1665014400": false,
                "1684713600": false,
                "1749340800": false,
            }
        },
        id: "2769"
    },
    "swapmode-v2": {
        id: "4116"
    },
    "swapmode-v3": {
        id: "5362"
    },
    "bulbaswap-v2": {
        id: "5301"
    },
    "bulbaswap-v3": {
        id: "5302"
    },
    "superswap-v2": {
        id: "5372"
    },
    "superswap-v3": {
        id: "5373"
    },
    "SecuredFinance": {
        id: "4197"
    },
    "thena-integral": {
        id: "6179"
    },
    "nerve": {
        id: "301"
    },
    "minmax": {
        id: "826"
    },
    "arthswap-v3": {
        id: "4272",
    },
    "alienbase-v3": {
        id: "3361",
    },
    "blasterswap": {
        id: "4296",
    },
    "cleopatra-v2": {
        id: "4286",
    },
    "moraswap-v3": {
        id: "4269",
    },
    "infusion": {
        id: "4294",
    },
    "pharaoh-v2": {
        id: "4287"
    },
    "omax-swap": {
        id: "2464",
    },
    "kim-exchange-v2": {
        id: "4038",
    },
    "merchant-moe-liquidity-book": {
        id: "4427",
    },
    "web3world": {
        id: "4430",
    },
    "glyph-exchange": {
        id: "4347",
    },
    "firefly": {
        id: "4500"
    },
    "velodrome-slipstream": {
        id: "4249",
    },
    "FeeFree": {
        id: "4530",
    },
    "linehub-v3": {
        id: "4661",
    },
    "physica-finance": {
        id: "4719",
    },
    "bitgenie-amm": {
        id: "4573",
    },
    "aerodrome-slipstream": {
        id: "4524"
    },
    "capybara-exchange": {
        id: "4747",
    },
    "vanillaswap-v2": {
        id: "4600",
    },
    "vanillaswap-v3": {
        id: "4601",
    },
    "maverick-v2": {
        id: "4752"
    },
    "thruster-v3": {
        id: "4199",
    },
    "thruster-v2": {
        id: "4207",
    },
    "balanced": {
        id: "448",
    },
    "voltage-v3": {
        id: "4188",
    },
    "dusa": {
        id: "4788",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1718841600": true,
                "1718755200": true,
            }
        }
    },
    "traderjoe-lb-v2-2": {
        id: "4794",
    },
    "carbondefi": {
        id: "2890"
    },
    "glyph-exchange-v4": {
        id: "4880"
    },
    "dexswap": {
        id: "3277",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1722211200": true
            }
        }
    },
    "blasterswap-v3": {
        id: "4728",
    },
    "splash": {
        id: "4712",
    },
    "jellyverse": {
        id: "4772",
    },
    "xtrade": {
        id: "5040"
    },
    "magicsea-lb": {
        id: "4755",
    },
    "apexdefi": {
        id: "5065"
    },
    "dtx-v3": {
        id: "5141",
    },
    "scribe-exchange-v4": {
        id: "4943",
    },
    "mintswap": {
        id: "4811",
    },
    "nabla": {
        id: "5309",
    },
    "aerodrome": {
        id: "3450"
    },
    "shadow-exchange": {
        id: "5570",
    },
    "holdstation-swap": {
        id: "5493",
    },
    "zkswap-stable": {
        id: "5391",
    },
    "zkswap-v3": {
        id: "5392",
    },
    "nova-fi": {
        id: "5677",
    },
    "reservoir-tools-amm": {
        id: "5678",
    },
    "reservoir-tools-clmm": {
        id: "5679",
    },
    "kodiak-v3": {
        id: "5744",
    },
    "beralis-v3": {
        id: "5759",
    },
    "rooster": {
        id: "5704",
    },
    "sailfish": {
        id: "5643",
    },
    "artexswap": {
        id: "5665",
    },
    "mondrain": {
        id: "5765",
    },
    "shadow-legacy": {
        id: "5682"
    },
    "puppyfun": {
        id: "5895"
    },
    "kittenswap": {
        id: "5876"
    },
    "kittenswap-cl": {
        id: "6004"
    },
    "interest-protocol-stable-swap": {
        id: "6034"
    },
    "gt3": {
        id: "6184"
    },
    "near-intents": {
        id: "6225"
    },
    "fastjpeg": {
        id: "6229"
    },
    "interest-movement-curve": {
        id: "6055"
    },
    "garden": {
        id: "4086"
    },
    "skate-amm": {
        id: "6246"
    },
    "saros-dlmm": {
        id: "6250"
    },
    "bitcoin-bridge": {
        id: "6256"
    },
    "uniderp": {
        id: "6126"
    },
    "meteora-damm-v2": {
        id: "6288"
    },
    "meteora-dbc": {
        id: "6290"
    },
    "x3x": {
        id: "6272"
    },
    "duality": {
        id: "5459"
    },
    "gliquid": {
        id: "6294"
    },
    "oxium": {
        id: "6301"
    },
    "stars-arena": {
        id: "3564"
    },
    "garuda-defi": {
        id: "6324"
    },
    "smardex-usdn": {
        id: "6238"
    },
    "volta-markets": {
        id: "6345"
    },
    "tapp-exchange": {
        id: "6352"
    }
} as AdaptorsConfig
