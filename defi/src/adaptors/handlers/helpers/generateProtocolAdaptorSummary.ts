import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import { formatTimestampAsDate, getTimestampAtStartOfDayUTC } from "../../../utils/date"
import { DimensionRules } from "../../data"
import { getConfigByType } from "../../data/configs"
import { IJSON, ProtocolAdaptor } from "../../data/types"
import { AdaptorRecord, AdaptorRecordType, AdaptorRecordTypeMapReverse, getAdaptorRecord } from "../../db-utils/adaptor-record"
import { formatChain } from "../../utils/getAllChainsFromAdaptors"
import { sendDiscordAlert } from "../../utils/notify"
import { calcNdChange, getWoWStats, sumAllVolumes } from "../../utils/volumeCalcs"
import { ACCOMULATIVE_ADAPTOR_TYPE, getExtraTypes, IGeneralStats, ProtocolAdaptorSummary, ProtocolStats } from "../getOverviewProcess"
import { ONE_DAY_IN_SECONDS } from "../getProtocol"
import generateCleanRecords from "./generateCleanRecords"
import getCachedReturnValue from "./getCachedReturnValue"

/**
 * All this iterations can be avoided by;
 * Prevent errors being stored with entries and add flag when it fails (or no flag)
 * Extrapolated data can be stored next to correct data with a flag pointing out that its extrapolated
 * Array->Map can be avoided by slicing the data arrays
 */

const getAdapterKey = (
    adapterId: string,
    versionKey: string,
    adaptorRecordType: AdaptorRecordType,
    adaptorType: AdapterType,
    protocolType?: ProtocolType,
    chainFilter?: string
) => `generateCleanRecords/${adaptorType}/${adapterId}/${versionKey}/${protocolType}/${adaptorRecordType}_${chainFilter}`

export default async (adapter: ProtocolAdaptor, adaptorRecordType: AdaptorRecordType, adaptorType: AdapterType, chainFilter?: string, onError?: (e: Error) => Promise<void>): Promise<ProtocolAdaptorSummary> => {
    console.info("Generating summary for:", adapter.name, "with params", adaptorRecordType, adaptorType, chainFilter)
    try {
        // Get all records from db
        let adaptorRecordsRaw = await getAdaptorRecord(adapter.id, adaptorRecordType, adapter.protocolType)
        const rawTotalRecord = ACCOMULATIVE_ADAPTOR_TYPE[adaptorRecordType]
            ? await getAdaptorRecord(adapter.id, ACCOMULATIVE_ADAPTOR_TYPE[adaptorRecordType], adapter.protocolType, "LAST").catch(_e => { }) as AdaptorRecord | undefined
            : undefined

        let protocolsKeys = [adapter.module]
        if (adapter?.enabled && adapter.versionKey) {
            protocolsKeys = [adapter.versionKey]
        }
        const totalRecord = rawTotalRecord?.getCleanAdaptorRecord(chainFilter ? [chainFilter] : undefined, protocolsKeys[0])
        // This check is made to infer AdaptorRecord[] type instead of AdaptorRecord type
        if (!(adaptorRecordsRaw instanceof Array)) throw new Error("Wrong volume queried")
        if (adaptorRecordsRaw.length === 0) throw new Error(`${adapter.name} ${adapter.id} has no records stored${chainFilter ? ` for chain ${chainFilter}` : ''}`)
        let lastRecordRaw = adaptorRecordsRaw[adaptorRecordsRaw.length - 1]
        const cleanLastReacord = JSON.parse(JSON.stringify(lastRecordRaw.getCleanAdaptorRecord(chainFilter ? [chainFilter] : undefined, protocolsKeys[0])))
        if (sumAllVolumes(lastRecordRaw.data) === 0) {
            lastRecordRaw = adaptorRecordsRaw[adaptorRecordsRaw.length - 2]
            adaptorRecordsRaw[adaptorRecordsRaw.length - 1].data = adaptorRecordsRaw[adaptorRecordsRaw.length - 2].data
        }

        // Get extra revenue
        const extraTypes: IJSON<number | null> = {}
        for (const recordType of getExtraTypes(adaptorType)) {
            const value = await getAdaptorRecord(adapter.id, recordType, adapter.protocolType, "TIMESTAMP", lastRecordRaw.timestamp).catch(_e => { }) as AdaptorRecord | undefined
            const cleanRecord = value?.getCleanAdaptorRecord(chainFilter ? [chainFilter] : undefined, protocolsKeys[0])
            if (AdaptorRecordTypeMapReverse[recordType]) {
                extraTypes[AdaptorRecordTypeMapReverse[recordType]] = cleanRecord ? sumAllVolumes(cleanRecord.data) : null
            }
        }

        const startTimestamp = adapter.startFrom
        const startIndex = startTimestamp ? adaptorRecordsRaw.findIndex(ar => ar.timestamp === startTimestamp) : -1
        let adaptorRecords = adaptorRecordsRaw.slice(startIndex + 1)


        // Clean data by chain
        console.info("Cleaning records", adapter.name, adapter.id, adapter.module, adaptorRecords.length)
        const cleanRecords = await getCachedReturnValue(
            getAdapterKey(
                adapter.id,
                adapter.versionKey ?? adapter.module,
                adaptorRecordType,
                adaptorType,
                adapter.protocolType,
                chainFilter
            ),
            async () => generateCleanRecords(
                adaptorRecords,
                adapter.chains,
                protocolsKeys,
                chainFilter
            ))
        console.info("Cleaning records OK", adapter.name, adapter.id, adapter.module, cleanRecords.cleanRecordsArr.length)


        adaptorRecords = cleanRecords.cleanRecordsArr
        if (adaptorRecords.length === 0) throw new Error(`${adapter.name} ${adapter.id} has no records stored${chainFilter ? ` for chain ${chainFilter}` : ''}`)

        // Calc stats with last available data
        const yesterdaysCleanTimestamp = getTimestampAtStartOfDayUTC((Date.now() - ONE_DAY_IN_SECONDS * 1000) / 1000)
        const lastAvailableDataTimestamp = adaptorRecords[adaptorRecords.length - 1].timestamp
        const lastDaysExtrapolation = ((yesterdaysCleanTimestamp - lastAvailableDataTimestamp) / ONE_DAY_IN_SECONDS) < 5
        const stats = getStats(adapter, adaptorRecords, cleanRecords.cleanRecordsMap,lastAvailableDataTimestamp)

        if (yesterdaysCleanTimestamp > lastAvailableDataTimestamp || cleanLastReacord == null) {
            if (onError) onError(new Error(`
Adapter: ${adapter.name} [${adapter.id}]
${AdaptorRecordTypeMapReverse[adaptorRecordType]} not updated
${formatTimestampAsDate(yesterdaysCleanTimestamp.toString())} <- Report date
${formatTimestampAsDate(lastAvailableDataTimestamp.toString())} <- Last date found
${sumAllVolumes(lastRecordRaw.data)} <- Last computed ${AdaptorRecordTypeMapReverse[adaptorRecordType]}
Last record found\n${JSON.stringify(lastRecordRaw.data, null, 2)}
`))
        }

        // Now we add adaptorRecordType to the extra types object
        extraTypes[AdaptorRecordTypeMapReverse[adaptorRecordType]] = stats.total24h

        // And calculate the missing types
        const rules = DimensionRules(adaptorType) ?? {}
        for (const rule of Object.values(rules)) {
            rule(extraTypes, adapter.category ?? '')
        }
        // Populate last missing days with last available data
        if (!adapter.disabled && lastDaysExtrapolation)
            for (let i = lastAvailableDataTimestamp + ONE_DAY_IN_SECONDS; i <= yesterdaysCleanTimestamp; i += ONE_DAY_IN_SECONDS) {
                const data = new AdaptorRecord(adaptorRecords[0].type, adaptorRecords[0].adaptorId, i, adaptorRecords[adaptorRecords.length - 1].data)
                adaptorRecords.push(data)
                cleanRecords.cleanRecordsMap[i] = data
            }

        return {
            spikes: cleanRecords.spikesLogs.length > 0 ? ["Spikes detected", ...cleanRecords.spikesLogs].join('\n') : undefined,
            name: adapter.name,
            disabled: adapter.disabled,
            displayName: adapter.displayName,
            module: adapter.module,
            category: adapter.category,
            logo: adapter.logo,
            records: adaptorRecords,
            recordsMap: cleanRecords.cleanRecordsMap,
            change_1d: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.change_1d,
            change_7d: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.change_7d,
            change_1m: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.change_1m,
            change_7dover7d: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.change_7dover7d,
            change_30dover30d: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.change_30dover30d,
            total24h: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.total24h,
            total48hto24h: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.total48hto24h,
            total7d: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.total7d,
            total30d: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.total30d,
            total14dto7d: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.total14dto7d,
            total60dto30d: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.total60dto30d,
            totalAllTime: totalRecord ? sumAllVolumes(totalRecord.data) : null,
            breakdown24h: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.breakdown24h,
            config: getConfigByType(adaptorType, adapter.module),
            chains: chainFilter ? [formatChain(chainFilter)] : adapter.chains.map(formatChain),
            protocolType: adapter.protocolType ?? ProtocolType.PROTOCOL,
            methodologyURL: adapter.methodologyURL,
            methodology: adapter.methodology,
            allAddresses: adapter.allAddresses,
            parentProtocol: adapter.parentProtocol,
            latestFetchIsOk: adapter?.config?.latestFetchIsOk ?? true,
            versionKey: adapter.versionKey,
            ...extraTypes
        }
    } catch (error) {
        // TODO: handle better errors
        if (onError) onError(error as Error)
        return {
            spikes: undefined,
            name: adapter.name,
            module: adapter.module,
            disabled: adapter.disabled,
            displayName: adapter.displayName,
            config: getConfigByType(adaptorType, adapter.module),
            category: adapter.category,
            logo: adapter.logo,
            protocolType: adapter.protocolType ?? ProtocolType.PROTOCOL,
            methodologyURL: adapter.methodologyURL,
            latestFetchIsOk: adapter?.config?.latestFetchIsOk ?? false,
            versionKey: adapter.versionKey,
            total24h: null,
            total48hto24h: null,
            total7d: null,
            total30d: null,
            total14dto7d: null,
            total60dto30d: null,
            totalAllTime: null,
            breakdown24h: null,
            change_1d: null,
            records: null,
            recordsMap: null,
            change_7d: null,
            change_1m: null,
            change_7dover7d: null,
            change_30dover30d: null,
            chains: chainFilter ? [formatChain(chainFilter)] : adapter.chains.map(formatChain),
        }
    }
}


const getStats = (adapter: ProtocolAdaptor, adaptorRecordsArr: AdaptorRecord[], adaptorRecordsMap: IJSON<AdaptorRecord>, baseTimestamp: number): IGeneralStats => {
    return {
        change_1d: calcNdChange(adaptorRecordsMap, 1, baseTimestamp, true).ndChange,
        change_7d: calcNdChange(adaptorRecordsMap, 7, baseTimestamp, true).ndChange,
        change_1m: calcNdChange(adaptorRecordsMap, 30, baseTimestamp, true).ndChange,
        ...getWoWStats([{
            recordsMap: adaptorRecordsMap
        }], undefined, baseTimestamp),
        total24h: adapter.disabled ? null : sumAllVolumes(adaptorRecordsArr[adaptorRecordsArr.length - 1].data),
        breakdown24h: adapter.disabled ? null : adaptorRecordsArr[adaptorRecordsArr.length - 1].data,
        total48hto24h: adapter.disabled ? null : calcNdChange(adaptorRecordsMap, 1, baseTimestamp, true).totalNd
    }
}