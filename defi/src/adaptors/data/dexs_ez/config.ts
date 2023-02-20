import { AdaptorsConfig } from "../types"

export default {
    "balancer": {
        enabled: true
    },
    "bancor": {
        enabled: true
    },
    "champagneswap": {
        enabled: true
    },
    "katana": {
        enabled: true
    },
    "pancakeswap": {
        enabled: true
    },
    "raydium": {
        enabled: true
    },
    "uniswap": {
        enabled: true
    },
    "traderjoe": {
        enabled: true
    },
    "sushiswap": {
        enabled: true
    },
    "spookyswap": {
        enabled: true
    },
    "spiritswap": {
        enabled: true
    },
    "soulswap": {
        enabled: true
    },
    "klayswap": {
        enabled: true
    },
    "osmosis": {
        enabled: true
    },
    "serum": {
        enabled: true,
        includedVolume: ["raydium"]
    },
    "curve": {
        enabled: true
    },
    "1inch": {
        enabled: false
    },
    "mooniswap": {
        enabled: true
    },
    "dodo": {
        enabled: true
    },
    "velodrome": {
        enabled: true
    },
    "gmx": {
        protocolsData: {
            'swap': {
                enabled: true
            },
            'derivatives': {
                enabled: false
            }
        },
        enabled: true
    },
    "quickswap": {
        enabled: true
    },
    "woofi": {
        enabled: true
    },
    "hashflow": {
        enabled: true
    },
    "zipswap": {
        enabled: true
    },
} as AdaptorsConfig
