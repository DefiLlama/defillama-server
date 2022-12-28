import { IJSON } from "../types"

const genericMethodologies: IJSON<IJSON<string>> = {
    "Dexes": {
        UserFees: "Swap fees paid by users",
        Fees: "Swap fees paid by users",
        Revenue: "Percentage of swap fees going to treasury and/or token holders",
        ProtocolRevenue: "Percentage of swap fees going to treasury",
        HoldersRevenue: "Money going to governance token holders",
        SupplySideRevenue: "Liquidity providers revenue"
    },
    "Lending": {
        UserFees: "Interest paid by borrowers",
        Fees: "Interest paid by borrowers",
        Revenue: "Percentage of interest going to treasury",
        ProtocolRevenue: "Percentage of interest going to treasury",
        // HoldersRevenue: null,
        SupplySideRevenue: "Interest paid to lenders"
    },
    "Chain": {
        UserFees: "Gas fees paid by users",
        Fees: "Gas fees paid by users",
        Revenue: "Burned coins",
        // ProtocolRevenue: null,
        // HoldersRevenue: null,
        // SupplySideRevenue: null
    },
    "Rollup": {
        UserFees: "Fees paid by users to sequencer",
        Fees: "Fees collected by sequencer paid by users",
        Revenue: "ETH earned from user fees minus cost to send transactions in L1",
        ProtocolRevenue: "ETH earned from user fees minus cost to send transactions in L1",
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
        UserFees: "Percentage of rewards paid to protocol",
        Fees: "Staking rewards",
        Revenue: "Percentage of user rewards paid to protocol",
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
        ProtocolRevenue: "Percentage of fees going to treasury",
        // HoldersRevenue: null,
        SupplySideRevenue: "LPs revenue"
    }
}

export const getParentProtocolMethodology = (name: string, versionNames: string[]) => {
    const text = (() => {
        if (versionNames.length === 1)
            return {
                isSumString: `All`,
                versions: `${versionNames[0].toUpperCase()} version`
            }
        else
            return {
                isSumString: `Sum of all`,
                versions: `${versionNames.map(v=>v.toUpperCase()).slice(0, -1).join(', ')} and ${versionNames[versionNames.length - 1].toUpperCase()} versions`
            }
    })()
    return {
        UserFees: `${text.isSumString} user fees from ${name}'s ${text.versions}`,
        Fees: `${text.isSumString} fees from ${name}'s ${text.versions}`,
        Revenue: `${text.isSumString} revenue from ${name}'s ${text.versions}`,
        ProtocolRevenue: `${text.isSumString} protocol revenue from ${name}'s ${text.versions}`,
        HoldersRevenue: `${text.isSumString} holders revenue from ${name}'s ${text.versions}`,
        SupplySideRevenue: `${text.isSumString} supply side revenue from ${name}'s ${text.versions}`
    }
}

export const getMethodologyByType = (category: string) => {
    return genericMethodologies?.[category]
}