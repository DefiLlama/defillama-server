import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import { formatTimestampAsDate, getTimestampAtStartOfDayUTC } from "../../../utils/date"
import { getCategory } from "../../data/helpers/generateProtocolAdaptorsList"
import { IJSON, ProtocolAdaptor } from "../../data/types"
import { AdaptorRecord, AdaptorRecordType, AdaptorRecordTypeMapReverse, getAdaptorRecord } from "../../db-utils/adaptor-record"
import { formatChain } from "../../utils/getAllChainsFromAdaptors"
import { calcNdChange, getStatsByProtocolVersion, sumAllVolumes } from "../../utils/volumeCalcs"
import { ACCOMULATIVE_ADAPTOR_TYPE, getExtraTypes, IGeneralStats, ProtocolAdaptorSummary, ProtocolStats } from "../getOverview"
import { ONE_DAY_IN_SECONDS } from "../getProtocol"
import generateCleanRecords from "./generateCleanRecords"

export default async (adapter: ProtocolAdaptor, adaptorRecordType: AdaptorRecordType, adaptorType: AdapterType, chainFilter?: string, onError?: (e: Error) => Promise<void>): Promise<ProtocolAdaptorSummary> => {
    try {
        // Get all records from db
        let adaptorRecords = await getAdaptorRecord(adapter.id, adaptorRecordType, adapter.protocolType)
        const rawTotalRecord = ACCOMULATIVE_ADAPTOR_TYPE[adaptorRecordType]
            ? await getAdaptorRecord(adapter.id, ACCOMULATIVE_ADAPTOR_TYPE[adaptorRecordType], adapter.protocolType, "LAST").catch(e => console.error(e)) as AdaptorRecord | undefined
            : undefined
        const totalRecord = rawTotalRecord?.getCleanAdaptorRecord(chainFilter ? [chainFilter] : undefined)
        // This check is made to infer AdaptorRecord[] type instead of AdaptorRecord type
        if (!(adaptorRecords instanceof Array)) throw new Error("Wrong volume queried")

        // Get extra revenue
        const extraTypes: IJSON<number | null> = {}
        const extraTypesByProtocolVersion: IJSON<IJSON<number | null>> = {}
        for (const recordType of getExtraTypes(adaptorType)) {
            const value = await getAdaptorRecord(adapter.id, recordType, adapter.protocolType, "LAST").catch(_e => { }) as AdaptorRecord | undefined
            const cleanRecord = value?.getCleanAdaptorRecord(chainFilter ? [chainFilter] : undefined)
            if (AdaptorRecordTypeMapReverse[recordType]) {
                extraTypes[AdaptorRecordTypeMapReverse[recordType]] = cleanRecord ? sumAllVolumes(cleanRecord.data) : null
                if (cleanRecord && Object.keys(adapter.protocolsData ?? {}).length > 1)
                    Object.keys(adapter.protocolsData ?? {}).forEach(protVersion => {
                        console.log("The extra ty", cleanRecord ? sumAllVolumes(cleanRecord.data, protVersion) : null)
                        extraTypesByProtocolVersion[protVersion] = {
                            ...extraTypesByProtocolVersion[protVersion],
                            [AdaptorRecordTypeMapReverse[recordType]]: cleanRecord ? sumAllVolumes(cleanRecord.data, protVersion) : null
                        }
                    })
            }

        }

        const startTimestamp = adapter.config?.startFrom
        const startIndex = startTimestamp ? adaptorRecords.findIndex(ar => ar.timestamp === startTimestamp) : -1
        adaptorRecords = adaptorRecords.slice(startIndex + 1)

        // Clean data by chain
        const cleanRecords = generateCleanRecords(
            adaptorRecords,
            adapter.chains,
            adapter.protocolsData ? Object.keys(adapter.protocolsData) : [adapter.module],
            chainFilter
        )
        adaptorRecords = cleanRecords.cleanRecordsArr
        if (adaptorRecords.length === 0) throw new Error(`${adapter.name} ${adapter.id} has no records stored${chainFilter ? ` for chain ${chainFilter}` : ''}`)

        // Calc stats with last available data
        const yesterdaysCleanTimestamp = getTimestampAtStartOfDayUTC((Date.now() - ONE_DAY_IN_SECONDS * 1000) / 1000)
        const lastAvailableDataTimestamp = adaptorRecords[adaptorRecords.length - 1].timestamp
        const stats = getStats(adapter, adaptorRecords, cleanRecords.cleanRecordsMap, lastAvailableDataTimestamp)
        const protocolVersions =
            adapter.protocolsData && Object.keys(adapter.protocolsData).length > 1
                ? getProtocolVersionStats(adapter, adaptorRecords, lastAvailableDataTimestamp, chainFilter, extraTypesByProtocolVersion)
                : null

        if (yesterdaysCleanTimestamp !== lastAvailableDataTimestamp) {
            if (onError) onError(new Error(`${AdaptorRecordTypeMapReverse[adaptorRecordType]} not updated\nAdapter: ${adapter.name} [${adapter.id}]\n${formatTimestampAsDate(yesterdaysCleanTimestamp.toString())} <- Report date\n${formatTimestampAsDate(lastAvailableDataTimestamp.toString())} <- Last data found`))
        }

        // Check if data looks is valid. Not sure if this should be added
        /* if (
            adaptorRecords.length !== 1
            && (
                !stats.change_1d
                || (stats.change_1d && (stats.change_1d < -99 || stats.change_1d > 10 * 100))
            )
        ) {
            if (onError) await onError(new Error(`${adapter.name} has a daily change of ${stats.change_1d}, looks sus...`))
        } */

        // Populate last missing days with last available data
        if (!adapter.disabled)
            for (let i = lastAvailableDataTimestamp + ONE_DAY_IN_SECONDS; i <= yesterdaysCleanTimestamp; i += ONE_DAY_IN_SECONDS) {
                const data = new AdaptorRecord(adaptorRecords[0].type, adaptorRecords[0].adaptorId, i, adaptorRecords[adaptorRecords.length - 1].data)
                adaptorRecords.push(data)
                cleanRecords.cleanRecordsMap[i] = data
            }

        return {
            name: adapter.name,
            disabled: adapter.disabled,
            displayName: adapter.displayName,
            module: adapter.module,
            category: getCategory(adaptorType, adapter.module, adapter.category),
            logo: adapter.logo,
            records: adaptorRecords,
            recordsMap: cleanRecords.cleanRecordsMap,
            change_1d: adapter.disabled ? null : stats.change_1d,
            change_7d: adapter.disabled ? null : stats.change_7d,
            change_1m: adapter.disabled ? null : stats.change_1m,
            total24h: adapter.disabled ? null : stats.total24h,
            totalAllTime: totalRecord ? sumAllVolumes(totalRecord.data) : null,
            breakdown24h: adapter.disabled ? null : stats.breakdown24h,
            config: adapter.config,
            chains: chainFilter ? [formatChain(chainFilter)] : adapter.chains.map(formatChain),
            protocolsStats: protocolVersions,
            protocolType: adapter.protocolType ?? ProtocolType.PROTOCOL,
            methodologyURL: adapter.methodologyURL,
            methodology: adapter.methodology,
            ...extraTypes
        }
    } catch (error) {
        // TODO: handle better errors
        if (onError) onError(error as Error)
        return {
            name: adapter.name,
            module: adapter.module,
            disabled: adapter.disabled,
            displayName: adapter.displayName,
            config: adapter.config,
            category: adapter.category,
            logo: adapter.logo,
            protocolType: adapter.protocolType ?? ProtocolType.PROTOCOL,
            methodologyURL: adapter.methodologyURL,
            total24h: null,
            totalAllTime: null,
            breakdown24h: null,
            change_1d: null,
            records: null,
            recordsMap: null,
            change_7d: null,
            change_1m: null,
            chains: chainFilter ? [formatChain(chainFilter)] : adapter.chains.map(formatChain),
            protocolsStats: null
        }
    }
}


const getStats = (adapter: ProtocolAdaptor, adaptorRecordsArr: AdaptorRecord[], adaptorRecordsMap: IJSON<AdaptorRecord>, baseTimestamp: number): IGeneralStats => {
    return {
        change_1d: calcNdChange(adaptorRecordsMap, 1, baseTimestamp, true),
        change_7d: calcNdChange(adaptorRecordsMap, 7, baseTimestamp, true),
        change_1m: calcNdChange(adaptorRecordsMap, 30, baseTimestamp, true),
        total24h: adapter.disabled ? null : sumAllVolumes(adaptorRecordsArr[adaptorRecordsArr.length - 1].data),
        breakdown24h: adapter.disabled ? null : adaptorRecordsArr[adaptorRecordsArr.length - 1].data
    }
}

const getProtocolVersionStats = (
    adapterData: ProtocolAdaptor,
    adaptorRecords: AdaptorRecord[],
    baseTimestamp: number,
    chainFilter?: string,
    extraTypesByProtocolVersion?: IJSON<IJSON<number | null>>
) => {
    if (!adapterData.protocolsData) return null
    const protocolVersionsStats = getStatsByProtocolVersion(adaptorRecords, baseTimestamp, adapterData.protocolsData)
    return Object.entries(adapterData.protocolsData)
        .reduce((acc, [protKey, data]) => ({
            ...acc,
            [protKey]: {
                ...data,
                chains: chainFilter ? [formatChain(chainFilter)] : data.chains.map(formatChain),
                ...protocolVersionsStats[protKey],
                ...(extraTypesByProtocolVersion?.[protKey] ?? {})
            }
        }), {} as ProtocolStats)
}