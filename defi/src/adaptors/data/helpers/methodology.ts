import { IJSON } from "../types"

const genericMethodologies: IJSON<IJSON<string>> = {
    "Dexes": {
        UserFees: "Swap fees paid by users",
        Fees: "Swap fees paid by users",
        Revenue: "% of swap fees going to treasury and/or token holders",
        ProtocolRevenue: "% of swap fees going to treasury",
        HoldersRevenue: "Money going to governance token holders",
        SupplySideRevenue: "Liquidity providers revenue"
    },
    "Lending": {
        UserFees: "Interest paid by borrowers",
        Fees: "Interest paid by borrowers",
        Revenue: "% of interest going to treasury",
        ProtocolRevenue: "% of interest going to treasury",
        // HoldersRevenue: null,
        SupplySideRevenue: "Interest paid to lenders"
    },
    "Chain": {
        UserFees: "Gas fees paid by users",
        Fees: "Gas fees paid by users",
        Revenue: "Burned coins (fees-sequencerCosts for rollups)"
        // ProtocolRevenue: null,
        // HoldersRevenue: null,
        // SupplySideRevenue: null
    },
    "NFT Marketplace": {
        UserFees: "Fees paid by users",
        Fees: "Fees paid by users",
        Revenue: "Marketplace revenue",
        ProtocolRevenue: "Marketplace revenue"
        // HoldersRevenue: null,
        // SupplySideRevenue: null
    },
    "Derivatives": {
        UserFees: "Fees paid by users",
        Fees: "Fees paid by users",
        Revenue: "Treasury and token holders revenue",
        ProtocolRevenue: "Fees going to treasury",
        HoldersRevenue: "Fees going to governance token holders",
        SupplySideRevenue: "LPs revenue"
    },
    "CDP": {
        UserFees: "Interest paid to borrow",
        Fees: "Interest paid by borrowers",
        Revenue: "Interest paid by borrowers",
        ProtocolRevenue: "Interest paid by borrowers"
    },
    "Liquid Staking": {
        UserFees: "% of rewards paid to protocol",
        Fees: "Staking rewards",
        Revenue: "% of user rewards paid to protocol",
        ProtocolRevenue: "Fee from users rewards",
        // HoldersRevenue: null,
        SupplySideRevenue: "Revenue earned by stETH holders",
    },
    "Yield": {
        UserFees: "Pays management + performance fees",
        Fees: "Yield",
        Revenue: "Management + performance fees",
        ProtocolRevenue: "Gets management + performance fees",
        // HoldersRevenue: null,
        SupplySideRevenue: "Generated yield excluding protocol fees"
    },
    "Synthetics": {
        UserFees: "Fees paid by users",
        Fees: "Fees paid by users",
        Revenue: "Fees paid by users",
        ProtocolRevenue: "% of fees going to treasury",
        // HoldersRevenue: null,
        SupplySideRevenue: "LPs revenue"
    }
}

export const getMethodologyByType = (category: string) => {
    return genericMethodologies?.[category]
}