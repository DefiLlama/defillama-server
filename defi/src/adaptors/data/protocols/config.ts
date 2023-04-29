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
    }
} as AdaptorsConfig
