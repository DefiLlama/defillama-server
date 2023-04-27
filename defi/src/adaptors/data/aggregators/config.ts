import { AdaptorsConfig } from "../types"

export default {
    "jupiter-aggregator": {
        "enabled": true,
        "id": "2141"
    },
    "dexible": {
        "enabled": true,
        disabled: true,
        "startFrom": 1630022400,
        "id": "2249",
        parentId: "2249",
        protocolsData: {
            Dexible_v2: {
                disabled: true,
                "id": "2249",
                enabled: true,
                displayName: "Dexible V2"
            }
        }
    },
    "deflex": {
        "enabled": true,
        "id": "2420"
    },
    "dforce": {
        "enabled": true,
        "id": "123"
    },
    "plexus": {
        enabled: true,
        id: "2740"
    }
} as AdaptorsConfig
