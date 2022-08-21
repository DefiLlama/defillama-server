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
        enabled: true
    },
    "katana": {
        enabled: true
    },
    "pancakeswap": {
        enabled: true
    }
} as {
    [name: string]: IVolumesConfig
}