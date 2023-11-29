import { AdaptorsConfig } from "../types"



export default {
    "lyra": {
        "enabled": true,
        "startFrom": 1656460800,
        "id": "503"
    },
    "premia": {
        "enabled": true,
        "id": "381",
        parentId: "Premia",
        protocolsData: {
            v2: {
                id: "381",
                enabled: true,
            },
            v3: {
                id: "3497",
                enabled: true,
            }
        }
    },
    "thales": {
        "enabled": true,
        "id": "534"
    },
    "hegic": {
        "enabled": true,
        "id": "128"
    },
    "opyn": {
        "enabled": false,
        "id": "285",
        parentId: "Opyn",
        protocolsData: {
            gamma: {
                id: "285",
                enabled: false,
            }
        }
    },
    "aevo": {
        "enabled": true,
        "id": "2797"
    },
    "typus": {
        "enabled": true,
        "id": "2946"
    },
    "rysk-finance": {
        "enabled": true,
        "id": "2605"
    },
    "tigris": {
        "enabled": true,
        "id": "3129"
    },
    "valorem": {
        "enabled": true,
        "id": "3501"
    },
    "derivio": {
        parentId: "Deri",
        "enabled": true,
        "id": "3759",
        protocolsData: {
            "derivatives": {
                "id": "3759",
                "enabled": true,
            }
        }
    }
} as AdaptorsConfig
