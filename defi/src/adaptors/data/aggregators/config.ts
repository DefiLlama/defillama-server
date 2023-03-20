import { AdaptorsConfig } from "../types"

export default {
    "jupiter-aggregator": {
        "enabled": true,
        "id": "2141"
    },
    "dexible": {
        "enabled": true,
        "startFrom": 1630022400,
        "id": "2249",
        protocolsData: {
            Dexible_v2: {
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
    "dForce-swap": {
        "enabled": true,
        "id": "123"
    }
} as AdaptorsConfig
