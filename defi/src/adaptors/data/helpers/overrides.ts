import { IJSON, ProtocolAdaptor } from "../types";

const overrides = {
    'ghostmarket': {
        category: "NFT Marketplace",
        allAddresses: [
            "neo:0x9b049f1283515eef1d3f6ac610e1595ed25ca3e9",
            "ethereum:0x35609dc59e15d03c5c865507e1348fa5abb319a8",
            "polygon:0x6a335ac6a3cdf444967fe03e7b6b273c86043990",
            "avax:0x0b53b5da7d0f275c31a6a182622bdf02474af253",
            "bsc:0x0b53b5da7d0f275c31a6a182622bdf02474af253"
        ]
    },
    'uniswap': {
        id: "1",
        name: "Uniswap"
    },
    'aave': {
        id: "111",
        name: "AAVE"
    },
    'gmx': {
        protocolsData: {
            'swap': {
                category: 'Dexes'
            },
            'derivatives': {
                category: 'Derivatives'
            }
        }
    },
    'opyn': {
        displayName: "Opyn Gamma"
    }
} as IJSON<Partial<ProtocolAdaptor>>

const overridesByType = {
    fees: {
        ...overrides,
        'gmx': {
            protocolsData: {
                'gmx': {
                    category: 'Derivatives'
                }
            }
        },
    }
} as IJSON<IJSON<Partial<ProtocolAdaptor>>>

export type IOverrides = IJSON<Partial<ProtocolAdaptor>>

export default (type?: string) => type ? overridesByType[type] ?? overrides : overrides

export const chainOverrides = {
    'arbitrum': {
        category: "Rollup"
    },
    'optimism': {
        category: "Rollup"
    }
} as IJSON<Partial<ProtocolAdaptor>>
