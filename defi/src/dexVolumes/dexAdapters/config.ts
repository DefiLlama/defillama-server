export interface IVolumesConfig {
    enabled?: boolean
    includedVolume?: string[]
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
    "wardenswap": {
        enabled: true
    },
    "kyberswap": {
        enabled: true
    },
    "ref-finance": {
        enabled: true
    },
    "solidly": {
        enabled: true
    },
    "orca": {
        enabled: true
    },
    "saber": {
        enabled: true
    },
    "platypus": {
        enabled: true
    },
    "yoshi-exchange": {
        enabled: true
    },
    "biswap": {
        enabled: true
    },
    "apeswap": {
        enabled: true
    },
    "pangolin": {
        enabled: true
    },
    "minswap": {
        enabled: true
    },
    "wingriders": {
        enabled: true
    },
    "wombat-exchange": {
        enabled: true
    },
    "dfyn": {
        enabled: true
    },
    "flamingo-finance": {
        enabled: true
    },
} as {
    [name: string]: IVolumesConfig
}
