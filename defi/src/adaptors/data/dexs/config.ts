import { CATEGORIES } from "../helpers/categories"
import { AdaptorsConfig } from "../types"

export default {
    "balancer": {
        "enabled": true,
        "id": "116",
        parentId: "Balancer",
        protocolsData: {
            v1: {
                id: "116",
                displayName: "Balancer V1",
                enabled: true,
            },
            v2: {
                id: "2611",
                displayName: "Balancer V2",
                enabled: true,
            }
        }
    },
    "bancor": {
        "enabled": true,
        "id": "162",
        parentId: "Bancor",
        protocolsData: {
            v3: {
                id: "1995",
                enabled: true,
            },
            "v2.1": {
                id: "162",
                enabled: true,
            }
        }
    },
    "champagneswap": {
        disabled: true,
        "enabled": true,
        "id": "1643"
    },
    "katana": {
        "enabled": true,
        "id": "797"
    },
    "pancakeswap": {
        "enabled": true,
        "id": "194",
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
                "id": "2529",
                startFrom: 1663718400
            },
            v3: {
                "enabled": true,
                "id": "2769"
            }
        },
    },
    "raydium": {
        "enabled": true,
        "id": "214"
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
    "traderjoe": {
        "enabled": true,
        "id": "468",
        parentId: "Trader Joe",
        protocolsData: {
            v1: {
                enabled: true,
                id: "468"
            },
            v2: {
                enabled: true,
                id: "2393"
            }
        }
    },
    "sushiswap": {
        "enabled": true,
        "id": "119",
        parentId: "Sushi",
        protocolsData: {
            classic: {
                enabled: true,
                id: "119"
            },
            trident: {
                enabled: true,
                id: "2152"
            },
            v3: {
                enabled: true,
                id: "2776"
            }
        }
    },
    "spookyswap": {
        "enabled": true,
        "id": "302"
    },
    "spiritswap": {
        parentId: "SpiritSwap",
        "enabled": true,
        "id": "311"
    },
    "soulswap": {
        "enabled": true,
        "id": "544"
    },
    "klayswap": {
        "enabled": true,
        "id": "508"
    },
    "osmosis": {
        "enabled": true,
        "id": "383"
    },
    "serum": {
        disabled: true,
        "enabled": true,
        "id": "145"
    },
    "curve": {
        "enabled": true,
        "id": "3"
    },
    "mooniswap": {
        "enabled": true,
        "id": "1053"
    },
    "dodo": {
        "enabled": true,
        "id": "146"
    },
    "velodrome": {
        parentId: "Velodrome",
        "enabled": true,
        "id": "1799"
    },
    "gmx": {
        parentId: "GMX",
        "protocolsData": {
            "swap": {
                "id": "337",
                "enabled": true,
                "category": "Dexes",
                "displayName": "GMX - SWAP"
            }
        },
        "enabled": true,
        "id": "337"
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
                enabled: true,
                id: "2239"
            },
            "liquidityHub": {
                enabled: true,
                id: "3743"
            }
        }
    },
    "woofi": {
        parentId: "WOOFi",
        "enabled": true,
        "id": "1461"
    },
    "hashflow": {
        "enabled": true,
        "id": "1447"
    },
    "zipswap": {
        "enabled": true,
        "id": "1296"
    },
    "wardenswap": {
        "enabled": true,
        "id": "392"
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
    "ref-finance": {
        "enabled": true,
        "id": "541"
    },
    "solidly": {
        "enabled": true,
        "id": "1407"
    },
    "orca": {
        "enabled": true,
        "id": "283"
    },
    "saber": {
        "enabled": true,
        "id": "419"
    },
    "platypus": {
        disabled: true,
        "enabled": true,
        "id": "944"
    },
    "yoshi-exchange": {
        "enabled": true,
        "id": "863"
    },
    "biswap": {
        parentId: "BiSwap",
        "enabled": true,
        "id": "373"
    },
    "apeswap": {
        parentId: "ApeSwap",
        "enabled": true,
        "id": "398"
    },
    "pangolin": {
        "enabled": true,
        "id": "246"
    },
    "minswap": {
        "enabled": true,
        "id": "1494"
    },
    "wingriders": {
        "enabled": true,
        "id": "1601"
    },
    "wombat-exchange": {
        "enabled": true,
        "id": "1700"
    },
    "dfyn": {
        "enabled": true,
        "id": "318"
    },
    "flamingo-finance": {
        "enabled": true,
        "id": "304"
    },
    "0x": {
        "enabled": true,
        "id": "2116",
        parentId: "2116",
        protocolsData: {
            "0x RFQ": {
                "id": "2116",
                enabled: true,
                displayName: "0x - RFQ"
            }
        }
    },
    "baryon": {
        "enabled": false,
        "id": "1950"
    },
    "cherryswap": {
        "enabled": true,
        "id": "543"
    },
    "clipper": {
        "enabled": true,
        "id": "622"
    },
    "cryptoswap": {
        "enabled": true,
        "id": "1750"
    },
    "ellipsis": {
        "enabled": true,
        "id": "238"
    },
    "klex-finance": {
        disabled: true,
        "enabled": true,
        "id": "2049"
    },
    "koyo": {
        disabled: true,
        "enabled": true,
        "id": "1766"
    },
    "pyeswap": {
        disabled: true,
        "enabled": true,
        "id": "2109"
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
    "sunswap": {
        parentId: "SUN.io",
        "enabled": true,
        "id": "690"
    },
    "whaleswap": {
        "enabled": true,
        disabled: true,
        "id": "1884"
    },
    "nomiswap": {
        "enabled": true,
        "id": "1823"
    },
    "beethoven-x": {
        parentId: "Beethoven X",
        "enabled": true,
        "id": "654"
    },
    "defi-swap": {
        "enabled": true,
        "id": "221"
    },
    "wanswap-dex": {
        "enabled": true,
        "id": "186"
    },
    "solarbeam": {
        "enabled": true,
        "id": "551"
    },
    "tomb-swap": {
        parentId: "Tomb Finance",
        "enabled": true,
        "id": "2129"
    },
    "dfx-finance": {
        "enabled": true,
        "id": "366"
    },
    "frax-swap": {
        parentId: "Frax Finance",
        "enabled": true,
        "id": "2121"
    },
    "iziswap": {
        parentId: "iZUMI Finance",
        "enabled": true,
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
        "enabled": true,
        "id": "680"
    },
    "junoswap": {
        disabled: true,
        "enabled": true,
        "id": "2052"
    },
    "knightswap-finance": {
        "enabled": true,
        "id": "942"
    },
    "mdex": {
        "enabled": true,
        "id": "334"
    },
    "meshswap": {
        "enabled": true,
        "id": "1726"
    },
    "mm-stableswap-polygon": {
        parentId: "MM Finance",
        "enabled": true,
        "id": "2015"
    },
    "radioshack": {
        "enabled": true,
        "id": "1616"
    },
    "mojitoswap": {
        "enabled": true,
        "id": "1181"
    },
    "yieldfields": {
        "enabled": true,
        "id": "1347"
    },
    "terraswap": {
        "enabled": true,
        disabled: true,
        "id": "491"
    },
    "saros": {
        disabled: true,
        "enabled": true,
        "id": "1262"
    },
    "vvs-finance": {
        "enabled": true,
        "id": "831"
    },
    "shibaswap": {
        "enabled": true,
        "id": "397"
    },
    "viperswap": {
        disabled: true,
        "enabled": true,
        "id": "313"
    },
    "oolongswap": {
        "enabled": true,
        "id": "794"
    },
    "swapr": {
        "enabled": true,
        "id": "292"
    },
    "cone": {
        "enabled": true,
        "id": "1970"
    },
    "claimswap": {
        "enabled": true,
        "id": "1455"
    },
    "spartacus-exchange": {
        "enabled": true,
        "id": "1755"
    },
    "beamswap": {
        "enabled": true,
        "id": "1289",
        parentId: "BeamSwap",
        protocolsData: {
            "classic": {
                id: "1289",
                enabled: true,
            },
            "stable-amm": {
                id: "2596",
                enabled: true,
            }
        }
    },
    "openleverage": {
        "enabled": true,
        "id": "1208"
    },
    "ubeswap": {
        "enabled": true,
        "id": "488"
    },
    "mobius-money": {
        "enabled": true,
        "id": "588"
    },
    "honeyswap": {
        "enabled": true,
        "id": "271"
    },
    "energiswap": {
        "enabled": true,
        "id": "242"
    },
    "stellaswap": {
        "enabled": true,
        "id": "1274"
    },
    "wagyuswap": {
        disabled: true,
        "enabled": true,
        "id": "1003"
    },
    "dystopia": {
        "enabled": true,
        "id": "1756"
    },
    "glide-finance": {
        "enabled": true,
        "id": "806"
    },
    "quipuswap": {
        "enabled": true,
        "id": "513"
    },
    "netswap": {
        "enabled": true,
        "id": "1140"
    },
    "astroport": {
        "enabled": true,
        disabled: true,
        "id": "1052"
    },
    "tethys-finance": {
        parentId: "Tethys Finance",
        "enabled": true,
        "id": "1139"
    },
    "mimo": {
        disabled: true,
        "enabled": true,
        "id": "1241"
    },
    "kaidex": {
        "enabled": true,
        "id": "712"
    },
    "lif3-swap": {
        parentId: "Lif3.com",
        "enabled": true,
        "id": "2040"
    },
    "swappi": {
        "enabled": true,
        "id": "1660"
    },
    "yodeswap": {
        disabled: true,
        "enabled": true,
        "id": "1980"
    },
    "defi-kingdoms": {
        disabled: true,
        "enabled": true,
        "id": "556"
    },
    "defiplaza": {
        "enabled": true,
        "id": "728"
    },
    "polycat": {
        parentId: "Polycat Finance",
        "enabled": true,
        "id": "499"
    },
    "voltswap": {
        "enabled": true,
        parentId: "Volt Finance",
        protocolsData: {
            v1: {
                "disabled": true,
                "id": "1225",
                displayName: "VoltSwap V1",
                enabled: true,
            },
            v2: {
                id: "2133",
                enabled: true,
            }
        },
        "id": "1225"
    },
    "yokaiswap": {
        "enabled": true,
        "id": "1002"
    },
    "protofi": {
        "enabled": true,
        "id": "1306"
    },
    "voltage": {
        "enabled": true,
        "id": "714"
    },
    "complus-network": {
        "enabled": true,
        "id": "471"
    },
    "padswap": {
        "enabled": true,
        "id": "644"
    },
    "sharkswap": {
        "enabled": true,
        "id": "1828"
    },
    "okcswap": {
        "enabled": true,
        "id": "2099"
    },
    "empiredex": {
        "enabled": true,
        "id": "812"
    },
    "makiswap": {
        disabled: true,
        "enabled": true,
        "id": "378"
    },
    "smartdex": {
        "enabled": true,
        "id": "883"
    },
    "cometh": {
        "enabled": true,
        "id": "261"
    },
    "xexchange": {
        "enabled": true,
        "id": "854"
    },
    "defichain-dex": {
        "enabled": true,
        "id": "1166"
    },
    "blue-planet": {
        parentId: "Planet",
        "enabled": true,
        "id": "2158"
    },
    "aldrin": {
        disabled: true,
        "enabled": true,
        "id": "739"
    },
    "capricorn-finance": {
        disabled: true,
        "enabled": true,
        "id": "2128"
    },
    "alex": {
        "enabled": true,
        "id": "1466"
    },
    "step-exchange": {
        "enabled": true,
        "id": "2312"
    },
    "pegasys": {
        parentId: "PegaSys",
        "enabled": true,
        "id": "1432"
    },
    "crodex": {
        "enabled": true,
        disabled: true,
        "id": "828"
    },
    "babyswap": {
        "enabled": true,
        "id": "597"
    },
    "lifinity": {
        "enabled": true,
        "id": "2154"
    },
    "vanswap": {
        "enabled": true,
        "id": "2066"
    },
    "dao-swap": {
        parentId: "DAO Maker",
        "enabled": true,
        "id": "2167"
    },
    "jswap": {
        disabled: true,
        "enabled": true,
        "id": "678"
    },
    "babydogeswap": {
        "enabled": true,
        "id": "2169"
    },
    "wigoswap": {
        "enabled": true,
        "id": "1351"
    },
    "levinswap": {
        "enabled": true,
        "id": "299"
    },
    "templedao-trade": {
        parentId: "Temple DAO",
        "enabled": true,
        "id": "2178"
    },
    "karura-swap": {
        "enabled": true,
        "id": "451"
    },
    "sphynx": {
        "enabled": true,
        "id": "1992"
    },
    "kuswap": {
        "enabled": true,
        "id": "480"
    },
    "paint-swap": {
        "enabled": true,
        "id": "421"
    },
    "benswap": {
        "enabled": true,
        "id": "749"
    },
    "surfswap": {
        "enabled": true,
        "id": "1868",
        parentId: "Surfswap",
        protocolsData: {
            classic: {
                "id": "1868",
                enabled: true,
            },
            "stable-amm": {
                "id": "2598",
                enabled: true,
            }
        }
    },
    "bogged-finance": {
        "enabled": false,
        "id": "617"
    },
    "jetswap": {
        "enabled": true,
        "id": "659"
    },
    "saucerswap": {
        "enabled": true,
        "id": "1979"
    },
    "synthetify": {
        "enabled": true,
        "id": "731"
    },
    "pandora": {
        "enabled": true,
        "id": "1698"
    },
    "paycash": {
        "enabled": true,
        "id": "1452"
    },
    "soy-finance": {
        "enabled": true,
        "id": "1008"
    },
    "photonswap-finance": {
        "enabled": true,
        disabled: true,
        "id": "847"
    },
    "alita-finance": {
        "enabled": true,
        "id": "561"
    },
    "unifi": {
        "enabled": true,
        "id": "646"
    },
    "wineryswap": {
        disabled: true,
        "enabled": true,
        "id": "2118"
    },
    "huckleberry": {
        parentId: "Huckleberry",
        "enabled": true,
        "id": "630"
    },
    "hakuswap": {
        "enabled": true,
        "id": "1253"
    },
    "leonicornswap": {
        "enabled": true,
        "id": "923"
    },
    "autoshark": {
        "enabled": true,
        "id": "1074"
    },
    "saddle-finance": {
        "enabled": true,
        "id": "202"
    },
    "titano-swych": {
        "enabled": true,
        "id": "2102"
    },
    "stellarx": {
        "enabled": true,
        "id": "972"
    },
    "ultronswap": {
        "enabled": true,
        "id": "2032"
    },
    "humble-defi": {
        "enabled": true,
        "id": "1629"
    },
    "pact": {
        "enabled": true,
        "id": "1468"
    },
    "algofi": {
        parentId: "Algofi",
        disabled: true,
        "enabled": true,
        "id": "2091"
    },
    "elk": {
        "enabled": true,
        "id": "420"
    },
    "luaswap": {
        "enabled": true,
        "id": "707"
    },
    "unicly": {
        disabled: true,
        "enabled": true,
        "id": "324"
    },
    "crema-finance": {
        "enabled": true,
        "id": "1412"
    },
    "icecreamswap": {
        disabled: true,
        "enabled": true,
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
        "enabled": true,
        "id": "581"
    },
    "fairyswap": {
        parentId: "FairySwap",
        disabled: true,
        "enabled": true,
        "id": "1671"
    },
    "moon-swap": {
        "enabled": true,
        "id": "1942"
    },
    "fx-swap": {
        "enabled": true,
        "id": "2138"
    },
    "pinkswap": {
        "enabled": true,
        "id": "367"
    },
    "spartan": {
        "enabled": true,
        "id": "1246"
    },
    "penguin": {
        "enabled": true,
        "id": "1575"
    },
    "vortex-protocol": {
        "enabled": false,
        "id": "1706"
    },
    "dinosaur-eggs": {
        "enabled": true,
        "id": "695"
    },
    "mcdex": {
        "enabled": false,
        "id": "232"
    },
    "mistswap": {
        disabled: true,
        "enabled": true,
        "id": "748"
    },
    "bxh": {
        "enabled": true,
        "id": "404"
    },
    "auraswap": {
        "enabled": true,
        "id": "1859"
    },
    "carbonswap": {
        "enabled": true,
        "id": "670"
    },
    "pangea-swap": {
        "enabled": true,
        "id": "1987"
    },
    "gravity-finance": {
        "enabled": true,
        "id": "351"
    },
    "4swap": {
        parentId: "Pando",
        disabled: true,
        "enabled": true,
        "id": "951"
    },
    "gravis": {
        "enabled": true,
        "id": "2195"
    },
    "tetu": {
        parentId: "parent#tetu",
        "enabled": true,
        "id": "2203"
    },
    "muesliswap": {
        "enabled": true,
        "id": "747"
    },
    "gin-finance": {
        "enabled": true,
        "id": "1795"
    },
    "ferro": {
        "enabled": true,
        "id": "1882"
    },
    "increment-swap": {
        parentId: "incrementFinance",
        "enabled": true,
        "id": "1907"
    },
    "chainge-finance": {
        "enabled": true,
        "id": "704"
    },
    "minerswap": {
        "enabled": false,
        "id": "2233"
    },
    "wavelength-dao": {
        "enabled": true,
        "id": "2220"
    },
    "thorswap": {
        "enabled": true,
        "id": "412"
    },
    "metatdex": {
        "enabled": true,
        "id": "2253"
    },
    "3xcalibur": {
        "enabled": true,
        "id": "2283"
    },
    "kava-swap": {
        "enabled": true,
        "id": "618"
    },
    "emdx": {
        "enabled": false,
        "id": "2299"
    },
    "cetus": {
        "enabled": true,
        "id": "2289"
    },
    "opx-finance": {
        "enabled": true,
        "id": "2256"
    },
    "camelot": {
        parentId: "Camelot",
        "enabled": true,
        "id": "2307"
    },
    "openbook": {
        "enabled": true,
        "id": "2322"
    },
    "orderly-network": {
        "enabled": true,
        "id": "2264",
        protocolsData: {
            "orderly-network": {
                "id": "2264",
                enabled: true,
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
        "enabled": true,
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
        "enabled": true,
        "id": "2342",
        protocolsData: {
            v1: {
                "id": "2342",
                enabled: true,
            },
            v2: {
                "id": "3654",
                enabled: true,
            }
        }
    },
    "10kswap": {
        "enabled": true,
        "id": "2345"
    },
    "solarflare": {
        "enabled": true,
        "id": "1269"
    },
    "sundaeswap": {
        "enabled": false,
        "id": "1302"
    },
    "wx.network": {
        "enabled": false,
        "id": "614"
    },
    "myswap": {
        "enabled": true,
        "id": "2367"
    },
    "liquidswap": {
        "enabled": true,
        "id": "2210"
    },
    "rubicon": {
        "enabled": true,
        "id": "799"
    },
    "aux-exchange": {
        "enabled": true,
        "id": "2213"
    },
    "wojak-finance": {
        disabled: true,
        "enabled": true,
        "id": "2113"
    },
    "ampleswap": {
        "enabled": true,
        "id": "2383"
    },
    "heliswap": {
        "enabled": true,
        "id": "2244"
    },
    "wingswap": {
        "enabled": true,
        "id": "976"
    },
    "zircon-gamma": {
        disabled: true,
        "enabled": true,
        "id": "2143"
    },
    "lumenswap": {
        "enabled": true,
        "id": "882"
    },
    "el-dorado-exchange": {
        "enabled": true,
        "id": "2356",
        parentId: "EDE",
        "protocolsData": {
            "swap": {
                "id": "2356",
                "enabled": true,
                "category": "Dexes",
                "displayName": "El Dorado Exchange - SWAP"
            }
        },
    },
    "mummy-finance": {
        "enabled": true,
        "id": "2361"
    },
    "level-finance": {
        "enabled": true,
        "id": "2395",
        protocolsData: {
            "level-finance": {
                "id": "2395",
                enabled: true,
            }
        }
    },
    "hyperjump": {
        "enabled": true,
        "id": "317"
    },
    "kokonut-swap": {
        "enabled": true,
        "id": "1790"
    },
    "demex": {
        "enabled": true,
        "id": "2001",
        "protocolsData": {
            "demex": {
                "id": "2001",
                enabled: true,
            }
        }
    },
    "syrup-finance": {
        disabled: true,
        "enabled": true,
        "id": "2401"
    },
    "axial": {
        disabled: true,
        "enabled": true,
        "id": "845"
    },
    "exinswap": {
        "enabled": true,
        "id": "1179"
    },
    "darkness": {
        disabled: true,
        "enabled": true,
        "id": "1555"
    },
    "zilswap": {
        "enabled": true,
        "id": "303"
    },
    "thena": {
        name: "Thena V1",
        displayName: "Thena V1",
        "enabled": true,
        "id": "2417"
    },
    "ttswap": {
        "enabled": true,
        "id": "705"
    },
    "aequinox": {
        disabled: true,
        "enabled": true,
        "id": "2090"
    },
    "vexchange": {
        "enabled": true,
        "id": "963"
    },
    "metropolis": {
        disabled: true,
        "enabled": true,
        "id": "2452"
    },
    "verse": {
        "enabled": true,
        "id": "1732"
    },
    "equalizer-exchange": {
        parentId: "Equalizer",
        "enabled": true,
        "id": "2332"
    },
    "canto-dex": {
        "enabled": true,
        "id": "1985"
    },
    "solidlydex": {
        "enabled": true,
        "id": "2400"
    },
    "defibox": {
        "enabled": true,
        "id": "507"
    },
    "shell-protocol": {
        "enabled": true,
        "id": "133"
    },
    "archly-finance": {
        "enabled": true,
        "id": "2317"
    },
    "zyberswap": {
        "enabled": true,
        "id": "2467",
        parentId: "ZyberSwap",
        protocolsData: {
            "v2": {
                enabled: true,
                id: "2467"
            },
            "v3": {
                enabled: true,
                id: "2602"
            },
            "stable": {
                enabled: true,
                id: "2530"
            }
        }
    },
    "hermes-protocol": {
        "enabled": true,
        "id": "1384"
    },
    "hiveswap": {
        parentId: "HiveSwap",
        "enabled": true,
        "id": "2485"
    },
    "plenty": {
        "enabled": true,
        "id": "490"
    },
    "jediswap": {
        parentId: "JediSwap",
        "enabled": false,
        "id": "2344"
    },
    "solidlizard": {
        "enabled": true,
        "id": "2528"
    },
    "onepunch": {
        disabled: true,
        "enabled": true,
        "id": "2534"
    },
    "thorwallet": {
        "enabled": false,
        "id": "2533"
    },
    "helix": {
        "enabled": true,
        "id": "2259",
        protocolsData: {
            "helix": {
                "id": "2259",
                enabled: true,
            }
        }
    },
    "ashswap": {
        "enabled": true,
        "id": "2551"
    },
    "veniceswap": {
        disabled: true,
        enabled: true,
        "id": "2550"
    },
    "oraidex": {
        enabled: true,
        "id": "2564"
    },
    "subzero-zswap": {
        enabled: true,
        "id": "2556"
    },
    "megaton-finance": {
        enabled: true,
        "id": "2540"
    },
    "bakeryswap": {
        "enabled": false,
        "id": "602"
    },
    "bisq": {
        "enabled": true,
        "id": "2588"
    },
    "dexalot": {
        "enabled": true,
        "id": "2589"
    },
    "metavault.trade": {
        parentId: "MetaVault",
        "enabled": true,
        "id": "1801",
        protocolsData: {
            "metavault.trade": {
                "id": "1801",
                enabled: true,
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
        enabled: true,
        id: "2603"
    },
    "oswap": {
        parentId: "Oswap",
        enabled: true,
        id: "1778"
    },
    "maverick": {
        enabled: true,
        id: "2644"
    },
    "integral": {
        enabled: true,
        id: "291"
    },
    "archerswap": {
        enabled: true,
        id: "2648"
    },
    "ponytaswap": {
        enabled: true,
        id: "2657"
    },
    "equilibre": {
        enabled: true,
        id: "2586"
    },
    "wemix.fi": {
        parentId: "WEMIX.FI",
        enabled: true,
        id: "2674"
    },
    "ramses-exchange": {
        parentId: "Ramses Exchange",
        enabled: true,
        id: "2675"
    },
    "zigzag": {
        enabled: true,
        id: "800"
    },
    "mute.io": {
        enabled: true,
        id: "2727"
    },
    "dexter": {
        enabled: true,
        id: "2737"
    },
    "swapline": {
        "enabled": true,
        "id": "2731"
    },
    "hadouken-amm": {
        parentId: "Hadouken Finance",
        "enabled": true,
        "id": "2748"
    },
    "acala-swap": {
        "enabled": true,
        "id": "1847"
    },
    "maia-v3": {
        "enabled": true,
        "id": "2760"
    },
    "morphex": {
        parentId: "Morphex",
        "protocolsData": {
            "swap": {
                "id": "2662",
                "enabled": true,
                "category": "Dexes",
                "displayName": "Morphex - SWAP"
            }
        },
        "enabled": true,
        "id": "2662"
    },
    "kyotoswap": {
        "enabled": true,
        "id": "2350"
    },
    "SmarDex": {
        "enabled": true,
        "id": "2695"
    },
    "mm-finance-arbitrum": {
        parentId: "MM Finance",
        "enabled": true,
        "id": "2754"
    },
    "native": {
        "enabled": true,
        "id": "2803"
    },
    "spacedex": {
        parentId: "2814",
        "protocolsData": {
            "swap": {
                "id": "2814",
                "enabled": true,
                "category": "Dexes",
                "displayName": "SpaceDex - SWAP"
            }
        },
        "enabled": true,
        "id": "2814"
    },
    "camelot-v3": {
        parentId: "Camelot",
        "enabled": true,
        "id": "2792"
    },
    "satoshiswap": {
        disabled: true,
        "enabled": true,
        "id": "2827"
    },
    "wagmi": {
        "enabled": true,
        "id": "2837"
    },
    "auragi": {
        "enabled": true,
        "id": "2773"
    },
    "covo-v2": {
        disabled: true,
        "enabled": true,
        "id": "2730",
        parentId: "Covo Finance",
        "protocolsData": {
            "swap": {
                "id": "2730",
                "enabled": true,
                disabled: true,
                "category": "Dexes",
                "displayName": "Covo V2 - SWAP",
                cleanRecordsConfig: {
                    genuineSpikes: true
                }
            }
        },
    },
    "polkaswap": {
        "enabled": true,
        "id": "713"
    },
    "thena-v3": {
        parentId: "Thena",
        "enabled": true,
        "id": "2864"
    },
    "astroswap": {
        disabled: true,
        "enabled": true,
        "id": "1368"
    },
    "merlin": {
        "enabled": true,
        "id": "2849"
    },
    "tealswap": {
        "enabled": true,
        "id": "2874"
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
    "pheasantswap": {
        "enabled": true,
        "id": "2896"
    },
    "velocimeter-v2": {
        parentId: "Velocimeter",
        "enabled": true,
        "id": "2668"
    },
    "joe-v2.1": {
        parentId: "Trader Joe",
        "enabled": true,
        "id": "2906",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1682899200": true,
                "1682812800": true
            },
        }
    },
    "chronos": {
        "enabled": true,
        "id": "2907"
    },
    "stellaswap-v3": {
        "enabled": true,
        "id": "2934"
    },
    "e3": {
        "enabled": true,
        "id": "2926"
    },
    "clober": {
        "enabled": true,
        "id": "2541"
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
    "vertex-protocol": {
        "enabled": true,
        "id": "2899",
        "protocolsData": {
            "swap": {
                "id": "2899",
                "enabled": true,
                "category": "Dexes"
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
        "enabled": true,
        "id": "2636"
    },
    "fulcrom-finance": {
        "enabled": true,
        "id": "2641",
        "protocolsData": {
            "swap": {
                "id": "2641",
                "enabled": true,
                "category": "Dexes",
                "displayName": "Fulcrom - SWAP",
            }
        },
    },
    "veax": {
        "enabled": true,
        "id": "2928"
    },
    "dpex": {
        "enabled": true,
        "id": "2488"
    },
    "forge": {
        "enabled": true,
        "id": "2804"
    },
    "interest-protocol": {
        "enabled": false,
        "id": "3015"
    },
    "fxdx": {
        "enabled": true,
        "id": "3036"
    },
    "sunswap-v2": {
        parentId: "SUN.io",
        "enabled": true,
        "id": "3005"
    },
    "pulsex-v1": {
        parentId: "PulseX",
        "enabled": true,
        "id": "2995",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1686009600": true,
            },
        }
    },
    "pulsex-v2": {
        parentId: "PulseX",
        "enabled": true,
        "id": "3060",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1686009600": true,
            },
        }
    },
    "fathom-dex": {
        "enabled": true,
        "id": "3077"
    },
    "heraswap": {
        "enabled": true,
        "id": "3089"
    },
    "miaswap": {
        "enabled": true,
        "id": "3090"
    },
    "hummus": {
        disabled: true,
        "enabled": true,
        "id": "1715"
    },
    "tokenlon": {
        "enabled": true,
        "id": "405",
        "protocolsData": {
            "tokenlon": {
                "id": "405",
                enabled: true,
            }
        }
    },
    "ramses-exchange-v2": {
        parentId: "Ramses Exchange",
        enabled: true,
        id: "3096"
    },
    "MantisSwap": {
        enabled: true,
        id: "2702"
    },
    "abcdefx": {
        enabled: true,
        id: "2376"
    },
    "thalaswap": {
        parentId: "Thala Labs",
        enabled: true,
        id: "2795"
    },
    "pearlfi": {
        enabled: true,
        id: "3121"
    },
    "ambient": {
        enabled: true,
        id: "3104"
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
    "litx": {
        disabled: true,
        enabled: true,
        id: "3159"
    },
    "voodoo-trade": {
        enabled: true,
        id: "3792",
        "protocolsData": {
            "swap": {
                "id": "3792",
                "enabled": true,
                "category": "Dexes",
            }
        },
    },
    "equity-spot": {
        parentId: "Equalizer",
        enabled: true,
        id: "3173"
    },
    "flowx-finance": {
        enabled: true,
        id: "3196"
    },
    "zkSwap_Finance": {
        enabled: true,
        id: "3180"
    },
    "pinnako": {
        enabled: true,
        id: "3209",
        "protocolsData": {
            "swap": {
                "id": "3209",
                "enabled": true,
                "category": "Dexes",
            }
        },
    },
    "croswap": {
        disabled: true,
        enabled: true,
        id: "2942"
    },
    "fusionx-v2": {
        parentId: "FusionX Finance",
        enabled: true,
        id: "3238"
    },
    "fusionx-v3": {
        parentId: "FusionX Finance",
        enabled: true,
        id: "3239"
    },
    "DerpDEX": {
        enabled: true,
        id: "3234"
    },
    "concordex-io": {
        "enabled": true,
        "id": "3172"
    },
    "icpswap": {
        "enabled": true,
        "id": "3257"
    },
    "echodex": {
        parentId: "EchoDEX",
        "enabled": true,
        "id": "3256"
    },
    "reax-one-dex": {
        "enabled": true,
        "id": "3260"
    },
    "deepbook-sui": {
        "enabled": true,
        "id": "3268"
    },
    "agni-fi": {
        "enabled": true,
        "id": "3265"
    },
    "horizondex": {
        "enabled": true,
        "id": "3255"
    },
    "drift-protocol": {
        "enabled": true,
        "id": "970",
        "protocolsData": {
            "swap": {
                "id": "970",
                "enabled": true,
            }
        },
    },
    "velodrome-v2": {
        parentId: "Velodrome",
        "enabled": true,
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
        "enabled": true,
        "id": "3246"
    },
    "grizzly-trade": {
        disabled: true,
        "enabled": true,
        "id": "3301",
        "protocolsData": {
            "swap": {
                disabled: true,
                "id": "3301",
                "enabled": true,
            }
        },
    },
    "crescent-swap": {
        "enabled": true,
        "id": "3315"
    },
    "brine": {
        "enabled": true,
        "id": "3316"
    },
    "ktx": {
        "enabled": true,
        "id": "3025",
        "protocolsData": {
            "swap": {
                "id": "3025",
                "enabled": true,
            }
        }
    },
    "velocore-v2": {
        "enabled": true,
        "id": "3330"
    },
    "syncswap": {
        "enabled": true,
        "id": "2728"
    },
    "echodex-v3": {
        parentId: "EchoDEX",
        "enabled": true,
        "id": "3349"
    },
    "fcon-dex": {
        disabled: true,
        "enabled": true,
        "id": "3299"
    },
    "throne-v3": {
        "id": "3382",
        "enabled": true,
        parentId: "Throne"
    },
    "dackieswap": {
        parentId: "DackieSwap",
        "enabled": true,
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
        "enabled": true,
        "id": "3408"
    },
    "gmx-v2": {
        parentId: "GMX",
        "enabled": true,
        "id": "3365",
        protocolsData: {
            "gmx-v2-swap": {
                "id": "3365",
                "enabled": true,
            }
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
        "enabled": true,
        "id": "3439"
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
    "swapbased": {
        parentId: "SwapBased",
        "enabled": true,
        "id": "3328",
        protocolsData: {
            "v2": {
                "id": "3328",
                "enabled": true,
            },
            "v3": {
                "id": "3409",
                "enabled": true,
            }
        }
    },
    "danogo": {
        "enabled": true,
        "id": "3454"
    },
    "aerodrome": {
        "enabled": true,
        "id": "3450"
    },
    "morphex-old": {
        parentId: "Morphex",
        "protocolsData": {
            "swap": {
                "id": "3483",
                "enabled": true,
                disabled: true,
                "category": "Dexes"
            }
        },
        "enabled": true,
        disabled: true,
        "id": "3483"
    },
    "spicyswap": {
        "enabled": true,
        "id": "1029"
    },
    "dackieswap-v2": {
        parentId: "DackieSwap",
        "enabled": true,
        "id": "3515",
    },
    "sithswap": {
        "enabled": true,
        "id": "2719"
    },
    "nether-fi": {
        "protocolsData": {
            "swap": {
                "id": "3509",
                "enabled": true,
                "category": "Dexes"
            }
        },
        "enabled": true,
        "id": "3509"
    },
    "bmx": {
        parentId: "Morphex",
        "enabled": true,
        "id": "3530",
        "protocolsData": {
            "swap": {
                "id": "3530",
                "enabled": true,
                "category": "Dexes"
            }
        }
    },
    "mango-v4": {
        parentId: "Mango Markets",
        "enabled": true,
        "id": "3174",
        protocolsData: {
            "spot": {
                "id": "3174",
                "enabled": true,
            }
        },
        cleanRecordsConfig: {
            genuineSpikes: {
                "1695081600": true,
            },
        }
    },
    "ekubo": {
        "enabled": true,
        "id": "3499"
    },
    "chronos-v2": {
        "enabled": true,
        "id": "3341"
    },
    "solidly-v3": {
        parentId: "Solidly Labs",
        "enabled": true,
        "id": "3481"
    },
    "tegro": {
        "enabled": true,
        "id": "3561"
    },
    "Scale": {
        parentId: "Equalizer",
        "enabled": true,
        "id": "3575"
    },
    "fvm-exchange": {
        parentId: "Velocimeter",
        "enabled": true,
        "id": "3291"
    },
    "blex": {
        "enabled": true,
        "id": "3605",
        protocolsData: {
            "volume": {
                "id": "3605",
                "enabled": true,
            }
        }
    },
    "xena-finance": {
        "enabled": true,
        "id": "3620"
    },
    "spectrum": {
        "enabled": true,
        "id": "1088"
    },
    "turbos": {
        "enabled": true,
        "id": "2940",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1697328000": true,
            },
        }
    },
    "tangleswap": {
        "enabled": true,
        "id": "3585"
    },
    "dx25": {
        "enabled": true,
        "id": "3650"
    },
    "shimmersea": {
        "enabled": true,
        "id": "3571"
    },
    "kriya-dex": {
        "enabled": true,
        "id": "2939"
    },
    "primex-finance": {
        "enabled": true,
        "id": "3664"
    },
    "candyswap": {
        "enabled": true,
        "id": "3682"
    },
    "luigiswap": {
        "enabled": true,
        "id": "3415"
    },
    "kinetix-v3": {
        parentId: "Kinetix",
        "enabled": true,
        "id": "3534",
        protocolsData: {
            "v3": {
                "id": "3534",
                "enabled": true,
            }
        }
    },
    "caviarnine": {
        parentId: "CaviarNine",
        "enabled": true,
        "id": "3645",
        protocolsData: {
            "orderbook": {
                "id": "3645",
                "enabled": true,
                "category": "Dexes"
            }
        }
    },
    "kinetix-derivative": {
        parentId: "Kinetix",
        "enabled": true,
        "id": "3465"
    },
    "retro": {
        "enabled": true,
        "id": "3311"
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
    "derivio": {
        "enabled": false,
        parentId: "Deri",
        "id": "3759",
        protocolsData: {
            "swap": {
                "id": "3759",
                "enabled": true,
            }
        }
    },
    "elektrik": {
        "enabled": true,
        "id": "3773"
    },
    "caviarnine-lsu-pool": {
        parentId: "CaviarNine",
        "enabled": true,
        "id": "3666"
    },
    "chimpexchange": {
        "enabled": true,
        "id": "3836"
    },
    "lighterv2": {
        parentId: "Lighter",
        "enabled": false,
        "id": "3854"
    },
    "thick": {
        "enabled": true,
        "id": "3878"
    },
    "noah-swap": {
        "enabled": true,
        "id": "2855"
    },
    "ascent": {
        "enabled": true,
        "id": "3867",
        parentId: "Ascent Exchange",
        protocolsData: {
            "v2": {
                "id": "3867",
                "enabled": true,
            },
            "v3": {
                "id": "3868",
                "enabled": true,
            }
        }
    },
    "pegasys-v3": {
        parentId: "PegaSys",
        "enabled": true,
        "id": "3178"
    },
    "canary": {
        "enabled": true,
        "id": "474"
    },
    "xfai": {
        "enabled": true,
        "id": "3816"
    },
    "zebra-v1": {
        parentId: "Zebra",
        "enabled": true,
        "id": "3668"
    },
    "zebra-v2": {
        parentId: "Zebra",
        "enabled": true,
        "id": "3901"
    },
    "astroport-v2": {
        "enabled": true,
        "id": "3117"
    },
    "kizuna": {
        "enabled": true,
        "id": "3913"
    },
    "butterxyz": {
        "enabled": true,
        "id": "3918"
    },
    "pharaoh-exchange": {
        "enabled": true,
        "id": "3921"
    },
    "swaap": {
        "enabled": true,
        "id": "2104",
        protocolsData: {
            "v1": {
                "id": "2104",
                "enabled": true,
            },
            "v2": {
                "id": "3218",
                "enabled": true,
            }
        }
    },
    "phoenix": {
        displayName: "Phoenix",
        "enabled": true,
        "id": "3170"
    },
    "ryze": {
        "enabled": true,
        "id": "3907"
    },
    "beamex": {
        "enabled": true,
        parentId: "BeamSwap",
        "id": "3251",
        protocolsData: {
            "beamex-swap": {
                "id": "3251",
                "enabled": true,
            }
        }
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
    "aftermath-fi-amm": {
        parentId: "Aftermath Finance",
        "enabled": true,
        "id": "3259"
    },
    "sanctum": {
        "enabled": true,
        "id": "3388",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1704240000": true,
            },
        }
    },
    "jibswap": {
        "enabled": true,
        "id": "3928"
    },
    "cleopatra-exchange": {
        "enabled": true,
        "id": "3985"
    },
    "zkswap": {
        "enabled": true,
        "id": "3280"
    },
    "trisolaris": {
        "enabled": true,
        "id": "784"
    },
    "nearpad": {
        "enabled": true,
        "id": "953"
    },
    "auroraswap": {
        "enabled": true,
        "id": "1174"
    },
    "wannaswap": {
        "enabled": true,
        "id": "980"
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
    "sunswap-v3": {
        parentId: "SUN.io",
        "enabled": true,
        "id": "4031"
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
    "ICDex": {
        "enabled": true,
        "id": "4040"
    },
    "horiza": {
        "enabled": true,
        "id": "4041"
    },
    "lexer": {
        "enabled": true,
        "id": "4087",
        protocolsData: {
            "swap": {
                "id": "4087",
                "enabled": true,
            }
        }
    },
    "starkdefi": {
        "enabled": true,
        "id": "3880",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1707177600": true,
            },
        }
    },
    "hiveswap-v3": {
        parentId: "HiveSwap",
        "enabled": true,
        "id": "4113"
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
    "econia": {
        "enabled": true,
        "id": "4128"
    },
    "symmetric": {
        "enabled": true,
        "id": "528",
        protocolsData: {
            "v2": {
                "id": "528",
                "enabled": true,
            }
        }
    },
    "Omnidrome": {
        "enabled": true,
        "id": "4119"
    },
    "jediswap-v2": {
        parentId: "JediSwap",
        "enabled": true,
        "id": "4144"
    },
    "swapsicle-v2": {
        parentId: "Swapsicle",
        "enabled": true,
        "id": "3716"
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
    "merchant-moe": {
        "enabled": true,
        "id": "4006"
    },
    "deltaswap": {
        parentId: "GammaSwap Protocol",
        "enabled": true,
        "id": "4062"
    },
    "lynex-v1": {
        parentId: "Lynex",
        "enabled": true,
        "id": "3908"
    },
    "Scopuly": {
        "enabled": true,
        "id": "4181"
    },
    "standard-mode": {
        "enabled": true,
        "id": "4186"
    },
    "sushi-aptos": {
        parentId: "Sushi",
        "enabled": true,
        "id": "3827"
    }
} as AdaptorsConfig
