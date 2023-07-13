import { AdaptorsConfig } from "../types"

export default {
    "emdx": {
        "enabled": true,
        "id": "2299"
    },
    "gmx": {
        parentId: "337",
        "protocolsData": {
            "derivatives": {
                displayName: "GMX - Derivatives",
                "id": "337",
                "enabled": true
            }
        },
        "enabled": true,
        "id": "337"
    },
    "jojo": {
        "enabled": true,
        "id": "2320"
    },
    "kperp-exchange": {
        "enabled": true,
        "id": "2326"
    },
    "metavault.trade": {
        parentId: "Metavault",
        "enabled": true,
        "id": "1801"
    },
    "synfutures": {
        "enabled": true,
        "id": "2328"
    },
    "vela": {
        "enabled": true,
        "id": "2548"
    },
    "morphex": {
        parentId: "2662",
        "protocolsData": {
            "derivatives": {
                displayName: "Morphex - Derivatives",
                "id": "2662",
                "enabled": true
            }
        },
        "enabled": true,
        "id": "2662"
    },
    "covo-v2": {
        "enabled": true,
        "id": "2730",
        parentId: "Covo Finance",
        "protocolsData": {
            "derivatives": {
                displayName: "Covo V2 - Derivatives",
                "id": "2730",
                "enabled": true,
                cleanRecordsConfig: {
                    genuineSpikes: true
                }
            }
        },
    },
    "spacedex": {
        parentId: "2814",
        "protocolsData": {
            "derivatives": {
                "id": "2814",
                "enabled": true,
                "displayName": "SpaceDex - Derivatives"
            }
        },
        "enabled": true,
        "id": "2814"
    },
    "hyperliquid": {
        "id": "2862",
        "enabled": true
    },
    "dydx": {
        "id": "144",
        "enabled": true
    },
    "level-finance-derivative": {
        "enabled": true,
        "id": "2395",
        "displayName": "Level Finance - Derivatives"
    },
    "mux-protocol": {
        "enabled": true,
        "id": "2254"
    },
    "polynomial-trade": {
        "enabled": true,
        "id": "2848"
    },
    "pika-protocol": {
        "enabled": true,
        "id": "916"
    },
    "el-dorado-exchange": {
        "enabled": true,
        "id": "2356",
        "protocolsData": {
            "derivatives": {
                "id": "2356",
                "enabled": true,
                "category": "Dexes",
                "displayName": "El Dorado Exchange - Derivatives"
            }
        },
    },
    "fulcrom-finance": {
        "enabled": true,
        "id": "2641",
        "protocolsData": {
            "derivatives": {
                "id": "2641",
                "enabled": true,
                "displayName": "Fulcrom - Derivatives",
            }
        },
    },
    "vertex-protocol": {
        "enabled": true,
        "id": "2899",
        "protocolsData": {
            "derivatives": {
                "id": "2899",
                "enabled": true
            }
        },
    },
    "urdex": {
        "id": "3085",
        "enabled": true
    },
    "voodoo-trade": {
        enabled: true,
        id: "3156",
        "protocolsData": {
            "derivatives": {
                "id": "3156",
                "enabled": true
            }
        },
    },
    "pinnako": {
        enabled: true,
        id: "3209",
        "protocolsData": {
            "derivatives": {
                "id": "3209",
                "enabled": true,
                "category": "Dexes",
            }
        },
    },
    "hmx": {
        "enabled": true,
        "id": "2296"
    }
} as AdaptorsConfig
