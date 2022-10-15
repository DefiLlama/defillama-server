import { AdapterType } from "@defillama/adaptors/adapters/types"
import { getTimestampAtStartOfDayUTC } from "../../../utils/date"
import { ProtocolAdaptor } from "../../data/types"
import { AdaptorRecord, AdaptorRecordType, getAdaptorRecord } from "../../db-utils/adaptor-record"
import { formatChain } from "../../utils/getAllChainsFromAdaptors"
import { calcNdChange, getStatsByProtocolVersion, sumAllVolumes } from "../../utils/volumeCalcs"
import { DEFAULT_CHART_BY_ADAPTOR_TYPE, IGeneralStats, ProtocolStats } from "../getOverview"
import { ONE_DAY_IN_SECONDS } from "../getProtocol"
import generateCleanRecords from "./generateCleanRecords"

export default async (adapter: ProtocolAdaptor, adaptorType: AdapterType, chainFilter?: string, onError?: (e: Error) => Promise<void>) => {
    try {
        // Get all records from db
        let adaptorRecords = (await getAdaptorRecord(adapter.id, DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType] as AdaptorRecordType))
        // This check is made to infer AdaptorRecord[] type instead of AdaptorRecord type
        if (!(adaptorRecords instanceof Array)) throw new Error("Wrong volume queried")

        // Clean data by chain
        adaptorRecords = generateCleanRecords(
            adaptorRecords,
            adapter.chains,
            adapter.protocolsData ? Object.keys(adapter.protocolsData) : [adapter.module],
            chainFilter
        )
        if (adaptorRecords.length === 0) throw new Error(`${adapter.name} has no records stored${chainFilter ? ` for chain ${chainFilter}` : ''}`)

        // Calc stats with last available data
        const yesterdaysCleanTimestamp = getTimestampAtStartOfDayUTC((Date.now() - ONE_DAY_IN_SECONDS * 1000) / 1000)
        const lastAvailableDataTimestamp = adaptorRecords[adaptorRecords.length - 1].timestamp
        const stats = getStats(adapter, adaptorRecords, lastAvailableDataTimestamp)
        const protocolVersions = getProtocolVersionStats(adapter, adaptorRecords, lastAvailableDataTimestamp, chainFilter)

        // Check if data looks is valid. Not sure if this should be added
        if (
            adaptorRecords.length !== 1
            && (
                !stats.change_1d
                || (stats.change_1d && (stats.change_1d < -99 || stats.change_1d > 10 * 100))
            )
        ) {
            if (onError) await onError(new Error(`${adapter.name} has a daily change of ${stats.change_1d}, looks sus...`))
        }

        // Populate last missing days with last available data
        for (let i = lastAvailableDataTimestamp + ONE_DAY_IN_SECONDS; i <= yesterdaysCleanTimestamp; i += ONE_DAY_IN_SECONDS)
            adaptorRecords.push(new AdaptorRecord(adaptorRecords[0].type, adaptorRecords[0].adaptorId, i, adaptorRecords[0].data))

        return {
            name: adapter.name,
            disabled: adapter.disabled,
            displayName: adapter.displayName,
            module: adapter.module,
            volumes: adaptorRecords,
            change_1d: stats.change_1d,
            change_7d: stats.change_7d,
            change_1m: stats.change_1m,
            totalVolume24h: stats.totalVolume24h,
            volume24hBreakdown: stats.volume24hBreakdown,
            chains: chainFilter ? [formatChain(chainFilter)] : adapter.chains,
            protocolsStats: protocolVersions

        }
    } catch (error) {
        // TODO: handle better errors
        if (onError) onError(error as Error)
        return {
            name: adapter.name,
            module: adapter.module,
            disabled: adapter.disabled,
            displayName: adapter.displayName,
            totalVolume24h: null,
            volume24hBreakdown: null,
            yesterdayTotalVolume: null,
            change_1d: null,
            volumes: null,
            change_7d: null,
            change_1m: null,
            chains: chainFilter ? [formatChain(chainFilter)] : adapter.chains.map(formatChain),
            protocolsStats: null
        }
    }
}


const getStats = (adapter: ProtocolAdaptor, adaptorRecords: AdaptorRecord[], baseTimestamp: number): IGeneralStats => {
    return {
        change_1d: calcNdChange(adaptorRecords, 1, baseTimestamp, true),
        change_7d: calcNdChange(adaptorRecords, 7, baseTimestamp, true),
        change_1m: calcNdChange(adaptorRecords, 30, baseTimestamp, true),
        totalVolume24h: adapter.disabled ? null : sumAllVolumes(adaptorRecords[adaptorRecords.length - 1].data),
        volume24hBreakdown: adapter.disabled ? null : adaptorRecords[adaptorRecords.length - 1].data
    }
}

const getProtocolVersionStats = (adapterData: ProtocolAdaptor, adaptorRecords: AdaptorRecord[], baseTimestamp: number, chainFilter?: string) => {
    if (!adapterData.protocolsData) return null
    const protocolVersionsStats = getStatsByProtocolVersion(adaptorRecords, baseTimestamp, adapterData.protocolsData)
    return Object.entries(adapterData.protocolsData)
        .reduce((acc, [protKey, data]) => ({
            ...acc,
            [protKey]: {
                ...data,
                chains: chainFilter ? [formatChain(chainFilter)] : data.chains.map(formatChain),
                ...protocolVersionsStats[protKey],
            }
        }), {} as ProtocolStats)
}