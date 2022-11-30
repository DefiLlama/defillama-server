import { IJSON } from "../types"

const genericMethodologies: IJSON<IJSON<string>> = {
    "Dexes": {
        UserFees: "Swap fees paid by users",
        TotalRevenue: "Swap fees paid by users",
        SupplySideRevenue: "LPs revenue",
        ProtocolRevenue: "Part of the swap fees going to protocol",
        HoldersRevenue: "Money going to governance token holders"
    },
    "Lending": {
        UserFees: "Interest paid by borrowers",
        TotalRevenue: "Interest paid by borrowers",
        SupplySideRevenue: "Interest paid to lenders",
        ProtocolRevenue: "Part of the interest going to protocol"
    },
    "Chains": {
        UserFees: "Gas fees paid by users",
        TotalRevenue: "Gas fees paid by users",
        ProtocolRevenue: "Burned coins (or fees-sequencerCosts for rollups)",
        HoldersRevenue: "Burned coins"
    },
    "NFT Marketplace": {
        UserFees: "Fees paid by users",
        TotalRevenue: "Fees paid by users",
        ProtocolRevenue: "Marketplace revenue",
        CreatorRevenue: "Creator earnings",
    },
    "Derivatives": {
        UserFees: "Fees paid by users",
        TotalRevenue: "Fees paid by users",
        SupplySideRevenue: "LPs revenue",
        ProtocolRevenue: "Protocol's revenue"
    },
    "CDP": {
        UserFees: "Interest paid by borrowers",
        TotalRevenue: "Interest paid by borrowers",
        ProtocolRevenue: "Interest paid by borrowers"
    },
    "Liquid Staking": {
        UserFees: "Money going to protocol",
        TotalRevenue: "Staking rewards",
        SupplySideRevenue: "Revenue earned by stETH holders",
        ProtocolRevenue: "Money going to protocol"
    },
    "Yield": {
        UserFees: "Depositor revenue",
        TotalRevenue: "Yield",
        SupplySideRevenue: "Depositor revenue",
        ProtocolRevenue: "Management + performance fees"
    },
    "Synthetics": {
        UserFees: "Fees paid by users",
        TotalRevenue: "Fees paid by users",
        SupplySideRevenue: "LPs revenue",
        ProtocolRevenue: "Part of fees going to protocol"
    }
}

export const getMethodologyByType = (category: string) => {
    return genericMethodologies?.[category]
}