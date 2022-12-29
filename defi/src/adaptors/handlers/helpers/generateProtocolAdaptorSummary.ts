import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import { formatTimestampAsDate, getTimestampAtStartOfDayUTC } from "../../../utils/date"
import { DimensionRules } from "../../data"
import { IJSON, ProtocolAdaptor } from "../../data/types"
import { AdaptorRecord, AdaptorRecordType, AdaptorRecordTypeMapReverse, getAdaptorRecord } from "../../db-utils/adaptor-record"
import { formatChain } from "../../utils/getAllChainsFromAdaptors"
import { sendDiscordAlert } from "../../utils/notify"
import { calcNdChange, getStatsByProtocolVersion, getWoWStats, sumAllVolumes } from "../../utils/volumeCalcs"
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
        const lastRecordRaw = adaptorRecords[adaptorRecords.length - 1]

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

        let protocolsKeys = [adapter.module]
        if (adapter.protocolsData) {
            protocolsKeys = Object.keys(adapter.protocolsData).filter(protKey => {
                return adapter.config?.protocolsData?.[protKey].enabled ?? true
            })
        }
        // Clean data by chain
        const cleanRecords = await generateCleanRecords(
            adaptorRecords,
            adapter.chains,
            protocolsKeys,
            chainFilter
        )

        for (const spikeMSG of cleanRecords.spikesLogs) {
            await sendDiscordAlert(spikeMSG, adaptorType)
        }

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
        if (protocolVersions) {
            Object.keys(protocolVersions).forEach(key => {
                extraTypesByProtocolVersion[key][AdaptorRecordTypeMapReverse[adaptorRecordType]] = protocolVersions[key].total24h
            })
        }
        // And calculate the missing types
        const rules = DimensionRules(adaptorType) ?? {}
        for (const rule of Object.values(rules)) {
            rule(extraTypes, adapter.category ?? '')
            if (protocolVersions) {
                Object.keys(protocolVersions).forEach(key => {
                    rule(extraTypesByProtocolVersion[key], adapter.category ?? '')
                })
            }
        }
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
            category: adapter.category,
            logo: adapter.logo,
            records: adaptorRecords,
            recordsMap: cleanRecords.cleanRecordsMap,
            change_1d: adapter.disabled ? null : stats.change_1d,
            change_7d: adapter.disabled ? null : stats.change_7d,
            change_1m: adapter.disabled ? null : stats.change_1m,
            change_7dover7d: adapter.disabled ? null : stats.change_7dover7d,
            total24h: adapter.disabled ? null : stats.total24h,
            total7d: adapter.disabled ? null : stats.total7d,
            totalAllTime: totalRecord ? sumAllVolumes(totalRecord.data) : null,
            breakdown24h: adapter.disabled ? null : stats.breakdown24h,
            config: adapter.config,
            chains: chainFilter ? [formatChain(chainFilter)] : adapter.chains.map(formatChain),
            protocolsStats: protocolVersions,
            protocolType: adapter.protocolType ?? ProtocolType.PROTOCOL,
            methodologyURL: adapter.methodologyURL,
            methodology: adapter.methodology,
            allAddresses: adapter.allAddresses,
            latestFetchIsOk: adapter?.config?.latestFetchIsOk ?? true,
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
            latestFetchIsOk: adapter?.config?.latestFetchIsOk ?? false,
            total24h: null,
            total7d: null,
            totalAllTime: null,
            breakdown24h: null,
            change_1d: null,
            records: null,
            recordsMap: null,
            change_7d: null,
            change_1m: null,
            change_7dover7d: null,
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
        ...getWoWStats([{
            recordsMap: adaptorRecordsMap
        }], undefined, baseTimestamp),
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
                chains: chainFilter ? [formatChain(chainFilter)] : data.chains?.map(formatChain),
                ...protocolVersionsStats[protKey],
                ...(extraTypesByProtocolVersion?.[protKey] ?? {})
            }
        }), {} as ProtocolStats)
}