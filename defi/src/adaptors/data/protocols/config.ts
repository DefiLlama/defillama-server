import { AdaptorsConfig } from "../types"



export default {
    "uniswap": {
        "enabled": true,
        "id": "1",
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
    "pancakeswap": {
        "enabled": true,
        "id": "194",
        protocolsData: {
            v1: {
                "disabled": true,
                "id": "2559"
            },
            v2: {
                enabled: true,
                "id": "194"
            },
            stableswap: {
                "enabled": true,
                "id": "2529"
            }
        },
    }
} as AdaptorsConfig