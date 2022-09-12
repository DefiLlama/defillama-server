export interface IVolumesConfig {
    enabled?: boolean
    includedVolume?: string[]
}

export default {
    "balancer": {
        enabled: true
    },
    "bancor": {
        enabled: false
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
    }
} as {
    [name: string]: IVolumesConfig
}
