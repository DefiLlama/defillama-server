import { IJSON, ProtocolAdaptor } from "../types";

const overrides = {
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
