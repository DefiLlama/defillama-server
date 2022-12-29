import generateProtocolAdaptorsList from "../helpers/generateProtocolAdaptorsList";
import fees_imports from "../../../utils/imports/fees_adapters"
import config from "./config";
import { AdaptorRecordTypeMapReverse } from "../../db-utils/adaptor-record";
import { IJSON } from "../types";
import { CATEGORIES } from "../helpers/categories";

// TODO: needs to be optimized. Currently loads to memory all adaptors
export const importModule = (module: string) => fees_imports[module].module

// KEYS USED TO MAP ATTRIBUTE -> KEY IN DYNAMO
export const KEYS_TO_STORE = AdaptorRecordTypeMapReverse

export { default as config } from "./config";

// Order matters!
const rules = (interval: 'daily' | 'total') => ({
    [`${interval}UserFees`]: (extraDimensions: IJSON<number | null>, category: string) => {
        const dimensionKey = `${interval}UserFees`
        if (extraDimensions[dimensionKey] !== null) return
        const categoriesFees: string[] = [CATEGORIES.DEX, CATEGORIES.Lending, CATEGORIES.Chain, CATEGORIES.NFT_Marketplace, CATEGORIES.CDP, CATEGORIES.Synthetics]
        if (categoriesFees.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}Fees`]
            return
        }
        const categoriesRevenue: string[] = [CATEGORIES.Chain, CATEGORIES.NFT_Marketplace, CATEGORIES.CDP]
        if (categoriesRevenue.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}Revenue`]
            return
        }
    },
    [`${interval}Fees`]: (extraDimensions: IJSON<number | null>, category: string) => {
        const dimensionKey = `${interval}Fees`
        if (extraDimensions[dimensionKey] != null) return
        const categoriesUserFees: string[] = [CATEGORIES.DEX, CATEGORIES.Lending, CATEGORIES.Chain, CATEGORIES.NFT_Marketplace, CATEGORIES.CDP, CATEGORIES.Synthetics]
        if (categoriesUserFees.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}UserFees`]
            return
        }
        const categoriesRevenue: string[] = [CATEGORIES.Chain, CATEGORIES.NFT_Marketplace, CATEGORIES.CDP]
        if (categoriesRevenue.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}Revenue`]
            return
        }
    },
    [`${interval}Revenue`]: (extraDimensions: IJSON<number | null>, category: string) => {
        const dimensionKey = `${interval}Revenue`
        if (extraDimensions[dimensionKey] != null) return
        const categoriesFees: string[] = [CATEGORIES.Chain, CATEGORIES.NFT_Marketplace, CATEGORIES.CDP]
        if (categoriesFees.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}Fees`]
            return
        }
        const Fees = extraDimensions[`${interval}Fees`]
        const SupplySideRevenue = extraDimensions[`${interval}SupplySideRevenue`]
        if (Fees !== null && SupplySideRevenue !== null) {
            extraDimensions[dimensionKey] = Fees - SupplySideRevenue
            return
        }
        const categoriesProtocolRevenue: string[] = [CATEGORIES.Lending, CATEGORIES.NFT_Marketplace, CATEGORIES.CDP, CATEGORIES.Liquid_Staking, CATEGORIES.Yield, CATEGORIES.Synthetics]
        if (categoriesProtocolRevenue.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}ProtocolRevenue`]
            return
        }
    },
    [`${interval}SupplySideRevenue`]: (extraDimensions: IJSON<number | null>, _category: string) => {
        const dimensionKey = `${interval}SupplySideRevenue`
        if (extraDimensions[dimensionKey] !== null) return
        const Fees = extraDimensions[`${interval}Fees`]
        const Revenue = extraDimensions[`${interval}Revenue`]
        if (Fees !== null && Revenue !== null) {
            extraDimensions[dimensionKey] = Fees - Revenue
            return
        }
    },
    [`${interval}ProtocolRevenue`]: (extraDimensions: IJSON<number | null>, category: string) => {
        const dimensionKey = `${interval}ProtocolRevenue`
        if (extraDimensions[dimensionKey] !== null) return
        const Revenue = extraDimensions[`${interval}Revenue`]
        const HoldersRevenue = extraDimensions[`${interval}HoldersRevenue`]
        if (HoldersRevenue !== null && Revenue !== null) {
            extraDimensions[dimensionKey] = Revenue - HoldersRevenue
            return
        }
        const categoriesRevenue: string[] = [CATEGORIES.NFT_Marketplace, CATEGORIES.CDP, CATEGORIES.Lending, CATEGORIES.Liquid_Staking, CATEGORIES.Yield, CATEGORIES.Synthetics]
        if (categoriesRevenue.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}Revenue`]
            return
        }
    },
    [`${interval}HoldersRevenue`]: (extraDimensions: IJSON<number | null>, _category: string) => {
        const dimensionKey = `${interval}HoldersRevenue`
        if (extraDimensions[dimensionKey] !== null) return
        const Revenue = extraDimensions[`${interval}Revenue`]
        const ProtocolRevenue = extraDimensions[`${interval}ProtocolRevenue`]
        if (ProtocolRevenue !== null && Revenue !== null) {
            extraDimensions[dimensionKey] = Revenue - ProtocolRevenue
            return
        }
    },
    [`${interval}CreatorRevenue`]: (_extraDimensions: IJSON<number | null>, _category: string) => { }
})

export const DimensionRules = {
    ...rules('daily'),
    ...rules('total')
}

export default generateProtocolAdaptorsList(fees_imports, config)