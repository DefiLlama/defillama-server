import { AdaptorsConfig } from "../types"

export default {
    'emdx': {
        enabled: true
    },
    "gmx": {
        protocolsData: {
            'swap': {
                enabled: false
            },
            'derivatives': {
                enabled: true
            }
        },
        enabled: true
    },
    'jojo': {
        enabled: true
    },
    'kperp-exchange': {
        enabled: true
    },
    'metavault.trade': {
        enabled: true
    },
    'synfutures': {
        enable: true
    }

} as AdaptorsConfig
