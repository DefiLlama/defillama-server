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
    }
} as AdaptorsConfig
