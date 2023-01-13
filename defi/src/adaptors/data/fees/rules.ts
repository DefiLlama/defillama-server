import { CATEGORIES } from "../helpers/categories"
import { IJSON } from "../types"

// Order matters!
const rules = (interval: 'daily' | 'total') => ({
    [`${interval}UserFees`]: (extraDimensions: IJSON<number | null>, category: string) => {
        const dimensionKey = `${interval}UserFees`
        if (typeof extraDimensions[dimensionKey] === 'number') return
        const categoriesFees: string[] = [CATEGORIES.DEX, CATEGORIES.Lending, CATEGORIES.NFT_Lending, CATEGORIES.Chain, CATEGORIES.Rollup, CATEGORIES.NFT_Marketplace, CATEGORIES.CDP, CATEGORIES.Synthetics, CATEGORIES.Derivatives]
        if (categoriesFees.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}Fees`]
            return
        }
        const categoriesRevenue: string[] = [CATEGORIES.Chain, CATEGORIES.Rollup, CATEGORIES.NFT_Marketplace, CATEGORIES.CDP]
        if (categoriesRevenue.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}Revenue`]
            return
        }
        const categoriesProtocolRevenue: string[] = [CATEGORIES.Yield]
        if (categoriesProtocolRevenue.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}Revenue`]
            return
        }
    },
    [`${interval}Fees`]: (extraDimensions: IJSON<number | null>, category: string) => {
        const dimensionKey = `${interval}Fees`
        if (extraDimensions[dimensionKey] != null) return
        const categoriesUserFees: string[] = [CATEGORIES.DEX, CATEGORIES.Lending, CATEGORIES.NFT_Lending, CATEGORIES.Chain, CATEGORIES.Rollup, CATEGORIES.NFT_Marketplace, CATEGORIES.CDP, CATEGORIES.Synthetics]
        if (categoriesUserFees.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}UserFees`]
            return
        }
        const categoriesRevenue: string[] = [CATEGORIES.Chain, CATEGORIES.Rollup, CATEGORIES.NFT_Marketplace, CATEGORIES.CDP]
        if (categoriesRevenue.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}Revenue`]
            return
        }
        const Revenue = extraDimensions[`${interval}Revenue`]
        const SupplySideRevenue = extraDimensions[`${interval}SupplySideRevenue`]
        if (typeof Revenue === 'number' || typeof SupplySideRevenue === 'number') {
            extraDimensions[dimensionKey] = (Revenue ?? 0) + (SupplySideRevenue ?? 0)
            return
        }
    },
    [`${interval}Revenue`]: (extraDimensions: IJSON<number | null>, category: string) => {
        const dimensionKey = `${interval}Revenue`
        if (typeof extraDimensions[dimensionKey] === 'number') return
        const categoriesFees: string[] = [CATEGORIES.Chain, CATEGORIES.Rollup, CATEGORIES.NFT_Marketplace, CATEGORIES.CDP]
        if (categoriesFees.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}Fees`]
            return
        }
        const Fees = extraDimensions[`${interval}Fees`]
        const SupplySideRevenue = extraDimensions[`${interval}SupplySideRevenue`]
        if (typeof Fees === 'number' && typeof SupplySideRevenue === 'number') {
            extraDimensions[dimensionKey] = Fees - SupplySideRevenue
            return
        }
        if (Fees === 0) {
            extraDimensions[dimensionKey] = Fees
            return
        }
        const categoriesProtocolRevenue: string[] = [CATEGORIES.Lending, CATEGORIES.NFT_Lending, CATEGORIES.NFT_Marketplace, CATEGORIES.CDP, CATEGORIES.Liquid_Staking, CATEGORIES.Yield, CATEGORIES.Synthetics]
        if (categoriesProtocolRevenue.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}ProtocolRevenue`]
            return
        }
        const ProtocolRevenue = extraDimensions[`${interval}ProtocolRevenue`]
        const HoldersRevenue = extraDimensions[`${interval}HoldersRevenue`]
        if (typeof ProtocolRevenue === 'number' || typeof HoldersRevenue === 'number') {
            extraDimensions[dimensionKey] = (ProtocolRevenue ?? 0) + (HoldersRevenue ?? 0)
            return
        }
        if (Fees === 0) {
            extraDimensions[dimensionKey] = Fees
            return
        }
    },
    [`${interval}SupplySideRevenue`]: (extraDimensions: IJSON<number | null>, category: string) => {
        const dimensionKey = `${interval}SupplySideRevenue`
        if (typeof extraDimensions[dimensionKey] === 'number') return
        const categories: string[] = [CATEGORIES.Lending, CATEGORIES.NFT_Lending, CATEGORIES.DEX, CATEGORIES.Derivatives, CATEGORIES.Options, CATEGORIES.Liquid_Staking, CATEGORIES.Yield, CATEGORIES.Synthetics]
        if (categories.includes(category)) {
            const Fees = extraDimensions[`${interval}Fees`]
            const Revenue = extraDimensions[`${interval}Revenue`]
            if (typeof Fees === 'number' && typeof Revenue === 'number') {
                extraDimensions[dimensionKey] = Fees - Revenue
                return
            }
            if (Fees === 0) {
                extraDimensions[dimensionKey] = Fees
                return
            }
            return
        }
    },
    [`${interval}ProtocolRevenue`]: (extraDimensions: IJSON<number | null>, category: string) => {
        const dimensionKey = `${interval}ProtocolRevenue`
        if (typeof extraDimensions[dimensionKey] === 'number') return
        const Revenue = extraDimensions[`${interval}Revenue`]
        const HoldersRevenue = extraDimensions[`${interval}HoldersRevenue`]
        if (typeof HoldersRevenue === 'number' && typeof Revenue === 'number') {
            extraDimensions[dimensionKey] = Revenue - HoldersRevenue
            return
        }
        if (Revenue === 0) {
            extraDimensions[dimensionKey] = Revenue
            return
        }
        const categoriesRevenue: string[] = [CATEGORIES.NFT_Marketplace, CATEGORIES.CDP, CATEGORIES.Lending, CATEGORIES.NFT_Lending, CATEGORIES.Liquid_Staking, CATEGORIES.Yield, CATEGORIES.Synthetics]
        if (categoriesRevenue.includes(category)) {
            extraDimensions[dimensionKey] = extraDimensions[`${interval}Revenue`]
            return
        }
    },
    [`${interval}HoldersRevenue`]: (extraDimensions: IJSON<number | null>, category: string) => {
        const dimensionKey = `${interval}HoldersRevenue`
        if (typeof extraDimensions[dimensionKey] === 'number') return
        const Revenue = extraDimensions[`${interval}Revenue`]
        const ProtocolRevenue = extraDimensions[`${interval}ProtocolRevenue`]
        const categories: string[] = [CATEGORIES.DEX, CATEGORIES.Derivatives, CATEGORIES.Options]
        if (categories.includes(category)) {
            if (typeof ProtocolRevenue === 'number' && typeof Revenue === 'number') {
                extraDimensions[dimensionKey] = Revenue - ProtocolRevenue
                return
            }
            if (Revenue === 0) {
                extraDimensions[dimensionKey] = Revenue
                return
            }
        }
    },
    [`${interval}CreatorRevenue`]: (_extraDimensions: IJSON<number | null>, _category: string) => { }
})

export default {
    ...rules('daily'),
    ...rules('total')
}