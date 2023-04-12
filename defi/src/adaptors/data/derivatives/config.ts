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
        "id": "1892",
        parentId: "2525",
        "protocolsData": {
            "derivatives": {
                displayName: "Covo V2 - Derivatives",
                "id": "1892",
                "enabled": true
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
    }
} as AdaptorsConfig
