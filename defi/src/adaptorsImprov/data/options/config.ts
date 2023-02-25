import { AdaptorsConfig } from "../types"



export default {
    "lyra": {
        "enabled": true,
        "startFrom": 1656460800,
        "id": "503"
    },
    "premia": {
        "enabled": true,
        "id": "381"
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
        protocolsData: {
            gamma: {
                id: "285"
            }
        }
    }
} as AdaptorsConfig
