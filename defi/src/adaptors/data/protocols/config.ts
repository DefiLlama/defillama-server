import { findLastIndex } from "lodash"
import { AdaptorsConfig } from "../types"



export default {
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
        cleanRecordsConfig: {
            genuineSpikes: {
                1665446400: true
            }
        },
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
                "id": "2529"
            },
            v3: {
                "enabled": true,
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
        "enabled": true,
        parentId: "1632",
        id: "smbswap",
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
    "arthswap-v3": {
        parentId: "ArthSwap",
        "enabled": true,
        "id": "4272",
    },
    "alienbase-v3": {
        parentId: "Alien Base",
        "enabled": true,
        "id": "3361",
    },
    "blasterswap": {
        parentId: "Blasterswap",
        "enabled": true,
        "id": "4296",
    },
    "cleopatra-v2": {
        parentId: "Cleopatra Exchange",
        "enabled": true,
        "id": "4286",
    },
    "moraswap-v3": {
        parentId: "Moraswap",
        "enabled": true,
        "id": "4269",
    },
    "infusion": {
        "enabled": true,
        "id": "4294",
    },
    "pharaoh-v2": {
        parentId: "Pharaoh Exchange",
        "enabled": true,
        "id": "4287"
    },
    "omax-swap": {
        "enabled": true,
        "id": "2464",
    },
    "kim-exchange-v2": {
        "enabled": true,
        "id": "4038",
        parentId: "KIM Exchange",
    },
    "swapmode-v2": {
        "enabled": true,
        "id": "4116",
    },
    "kim-exchange-v3": {
        "enabled": true,
        "id": "4299",
        parentId: "KIM Exchange",
    },
    "merchant-moe-liquidity-book": {
        parentId: "Merchant Moe",
        "enabled": true,
        "id": "4427",
    },
    "web3world": {
        "enabled": true,
        "id": "4430",
    },
    "glyph-exchange": {
        "id": "4347",
        enabled: true,
        protocolsData: {
            "classic": {
                "id": "4347",
                "enabled": true,
            }
        }
    },
    "firefly": {
        enabled: true,
        id: "4500",
        protocolsData: {
            "v3": {
                "id": "4500",
                "enabled": true,
            }
        }
    },
    "velodrome-slipstream": {
        parentId: "Velodrome",
        enabled: true,
        id: "4249",
    },
    "FeeFree": {
        enabled: true,
        id: "4530",
    },
    "linehub-v3": {
        parentId: "LineHub",
        enabled: true,
        id: "4661",
        protocolsData: {
            "v3": {
                enabled: true,
                id: "4661",
            }
        }
    },
    "physica-finance": {
        enabled: true,
        id: "4719",
        protocolsData: {
            "v3": {
                enabled: true,
                id: "4719",
            }
        }
    },
    "bitgenie-amm": {
        enabled: true,
        id: "4573",
    },
    "aerodrome-slipstream": {
        parentId: "Aerodrome",
        enabled: true,
        id: "4524"
    },
    "capybara-exchange": {
        enabled: true,
        id: "4747",
    },
    "vanillaswap-v2": {
        parentId: "VanillaSwap",
        enabled: true,
        id: "4600",
    },
    "vanillaswap-v3": {
        parentId: "VanillaSwap",
        enabled: true,
        id: "4601",
    },
    "maverick-v2": {
        parentId: "Maverick Protocol",
        enabled: true,
        id: "4752"
    },
    "thruster-v3": {
        parentId: "Thruster",
        enabled: true,
        id: "4199",
    },
    "thruster-v2": {
        parentId: "Thruster",
        enabled: true,
        id: "4207",
    },
    "balanced": {
        parentId: "BalancedDAO",
        enabled: true,
        id: "448",
    },
    "voltage-v3": {
        parentId: "Voltage",
        enabled: true,
        id: "4188",
    },
    "dusa": {
        enabled: true,
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
        enabled: true,
        id: "4794",
    },
    "carbondefi": {
        enabled: true,
        id: "2890"
    },
    "glyph-exchange-v4": {
        parentId: "Glyph Exchange",
        enabled: true,
        id: "4880",
        protocolsData: {
            "classic": {
                enabled: true,
                id: "4880",
            }
        }
    },
    "dexswap": {
        parentId: "DexFinance",
        enabled: true,
        id: "3277",
        cleanRecordsConfig: {
            genuineSpikes: {
                "1722211200": true
            }
        }
    },
    "blasterswap-v3": {
        parentId: "Blasterswap",
        enabled: true,
        id: "4728",
    },
    "splash": {
        enabled: true,
        id: "4712",
    },
    "jellyverse": {
        enabled: true,
        id: "4772",
        protocolsData: {
            "v2": {
                enabled: true,
                id: "4772",
            }
        }
    },
    "xtrade": {
        enabled: true,
        id: "5040"
    },
    "magicsea-lb": {
        parentId: "MagicSea",
        enabled: true,
        id: "4755",
    },
    "apexdefi": {
        enabled: true,
        id: "5065"
    }
} as AdaptorsConfig
