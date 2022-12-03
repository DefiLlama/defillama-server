import { IJSON, ProtocolAdaptor } from "../types";

export default {
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
    }
} as IJSON<Partial<ProtocolAdaptor>>