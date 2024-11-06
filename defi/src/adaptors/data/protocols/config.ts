import { AdaptorsConfig } from "../types"



export default {
    "uniswap": {
        "id": "1",
        parentId: "Uniswap",
        "protocolsData": {
            "v1": {
                "id": "2196"
            },
            "v2": {
                "id": "2197"
            },
            "v3": {
                "id": "2198"
            },
        },
        cleanRecordsConfig: {
            genuineSpikes: {
                1665446400: true
            }
        },
    },
    "pancakeswap": {
        "id": "194",
        parentId: "PancakeSwap",
        protocolsData: {
            v1: {
                "disabled": true,
                "id": "2590"
            },
            v2: {
                "id": "194"
            },
            stableswap: {
                "id": "2529"
            },
            v3: {
                "id": "2769"
            }
        },
        cleanRecordsConfig: {
            genuineSpikes: {
                1660176000: false,
                1665014400: false
            }
        },
    },
    "smbswap": {
        parentId: "1632",
        id: "smbswap",
        protocolsData: {
            v2: {
                "id": "1632"
            },
            v3: {
                "id": "2895"
            }
        },
    },
    "arthswap-v3": {
        parentId: "ArthSwap",
        "id": "4272",
    },
    "alienbase-v3": {
        parentId: "Alien Base",
        "id": "3361",
    },
    "blasterswap": {
        parentId: "Blasterswap",
        "id": "4296",
    },
    "cleopatra-v2": {
        parentId: "Cleopatra Exchange",
        "id": "4286",
    },
    "moraswap-v3": {
        parentId: "Moraswap",
        "id": "4269",
    },
    "infusion": {
        "id": "4294",
    },
    "pharaoh-v2": {
        parentId: "Pharaoh Exchange",
        "id": "4287"
    },
    "omax-swap": {
        "id": "2464",
    },
    "kim-exchange-v2": {
        "id": "4038",
        parentId: "KIM Exchange",
    },
    "swapmode-v2": {
        "id": "4116",
    },
    "kim-exchange-v3": {
        "id": "4299",
        parentId: "KIM Exchange",
    },
    "merchant-moe-liquidity-book": {
        parentId: "Merchant Moe",
        "id": "4427",
    },
    "web3world": {
        "id": "4430",
    },
    "glyph-exchange": {
        "id": "4347",
        protocolsData: {
            "classic": {
                "id": "4347",
            }
        }
    },
    "firefly": {
        id: "4500",
        protocolsData: {
            "v3": {
                "id": "4500",
            }
        }
    },
    "velodrome-slipstream": {
        parentId: "Velodrome",
        id: "4249",
    },
    "FeeFree": {
        id: "4530",
    },
    "linehub-v3": {
        parentId: "LineHub",
        id: "4661",
        protocolsData: {
            "v3": {
                id: "4661",
            }
        }
    },
    "physica-finance": {
        id: "4719",
        protocolsData: {
            "v3": {
                id: "4719",
            }
        }
    },
    "bitgenie-amm": {
        id: "4573",
    },
    "aerodrome-slipstream": {
        parentId: "Aerodrome",
        id: "4524"
    },
    "capybara-exchange": {
        id: "4747",
    },
    "vanillaswap-v2": {
        parentId: "VanillaSwap",
        id: "4600",
    },
    "vanillaswap-v3": {
        parentId: "VanillaSwap",
        id: "4601",
    },
    "maverick-v2": {
        parentId: "Maverick Protocol",
        id: "4752"
    },
    "thruster-v3": {
        parentId: "Thruster",
        id: "4199",
    },
    "thruster-v2": {
        parentId: "Thruster",
        id: "4207",
    },
    "balanced": {
        parentId: "BalancedDAO",
        id: "448",
    },
    "voltage-v3": {
        parentId: "Voltage",
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
        parentId: "Trader Joe",
        id: "4794",
    },
    "carbondefi": {
        id: "2890"
    },
    "glyph-exchange-v4": {
        parentId: "Glyph Exchange",
        id: "4880",
        protocolsData: {
            "classic": {
                id: "4880",
            }
        }
    },
    "dexswap": {
        parentId: "DexFinance",
        id: "3277",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1722211200": true
            }
        }
    },
    "blasterswap-v3": {
        parentId: "Blasterswap",
        id: "4728",
    },
    "splash": {
        id: "4712",
    },
    "jellyverse": {
        id: "4772",
        protocolsData: {
            "v2": {
                id: "4772",
            }
        }
    },
    "xtrade": {
        id: "5040"
    },
    "magicsea-lb": {
        parentId: "MagicSea",
        id: "4755",
    },
    "apexdefi": {
        id: "5065"
    },
    "dtx-v3": {
        parentId: "DTX",
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
    }
} as AdaptorsConfig
