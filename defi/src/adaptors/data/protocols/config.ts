import { AdaptorsConfig } from "../types"



export default {
    "uniswap": {
        enabled: true
    },
    "pancakeswap": {
        protocolsData: {
            'v1': {
                enabled: true
            },
            'v2': {
                enabled: true
            },
            'stableswap': {
                enabled: false
            }
        },
        enabled: true
    }
} as AdaptorsConfig