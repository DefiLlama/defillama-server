import { AdaptorsConfig } from "../types"



export default {
    "lyra": {
        parentId: "Lyra",
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
        "enabled": false,
        "id": "3129"
    },
    "valorem": {
        "enabled": true,
        "id": "3501"
    },
    "derivio": {
        parentId: "Deri",
        "enabled": false,
        "id": "3759",
        protocolsData: {
            "derivatives": {
                "id": "3759",
                "enabled": true,
            }
        }
    },
    "dopex": {
        parentId: "Dopex",
        "enabled": true,
        "id": "3817",
        protocolsData: {
            "clamm": {
                "id": "3817",
                "enabled": true,
            }
        }
    },
    "lyra-v2": {
        parentId: "Lyra",
        "enabled": true,
        "id": "3923"
    },
    "optionBlitz": {
        enabled: false, //sus behavior
        id: "4396"
    },
    "smilee-finance": {
        enabled: true,
        id: "4350"
    },
    "moby": {
        enabled: true,
        id: "4452"
    },
    "ithaca": {
        enabled: true,
        id: "4418"
    },
    "jaspervault": {
        enabled: true,
        id: "4630"
    },
    "umoja": {
        enabled: true,
        id: "4963"
    },
    "pancakeswap-options": {
        parentId: "PancakeSwap",
        enabled: true,
        id: "4967"
    },
    "arrow-markets": {
        enabled: true,
        id: "4957"
    }
} as AdaptorsConfig
