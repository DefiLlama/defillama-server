export interface IVolumesConfig {
    enabled: boolean
}

export default {
    "balancer": {
        enabled: true
    },
    "bancor": {
        enabled: true
    },
    "champagneswap": {
        enabled: false
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
        enabled: true
    },
    "curve": {
        enabled: true
    },
    "1inch": {
        enabled: false
    },
    "mooniswap": {
        enabled: true
    }
} as {
    [name: string]: IVolumesConfig
}