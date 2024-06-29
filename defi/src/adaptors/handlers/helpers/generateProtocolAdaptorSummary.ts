import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import { formatTimestampAsDate, getTimestampAtStartOfDayUTC } from "../../../utils/date"
import { getRules } from "../../data"
import { getConfigByType } from "../../data/configs"
import { IJSON, ProtocolAdaptor } from "../../data/types"
import { AdaptorRecord, AdaptorRecordType, AdaptorRecordTypeMapReverse, getAdaptorRecord2 as _getAdaptorRecord } from "../../db-utils/adaptor-record"
import { getDisplayChainName } from "../../utils/getAllChainsFromAdaptors"
import { calcNdChange, getWoWStats, sumAllVolumes } from "../../utils/volumeCalcs"
import { ACCOMULATIVE_ADAPTOR_TYPE, getExtraN30DTypes, getExtraTypes, IGeneralStats, ProtocolAdaptorSummary, ProtocolStats } from "../getOverviewProcess"
import { ONE_DAY_IN_SECONDS } from "../getProtocol"
import { convertDataToUSD } from "./convertRecordDataCurrency"
import generateCleanRecords from "./generateCleanRecords"
import getCachedReturnValue from "./getCachedReturnValue"
import { getAdaptorRecord2 } from "../../../api2/utils/dimensionsUtils"
import { getUniqStartOfTodayTimestamp } from "@defillama/dimension-adapters/helpers/getUniSubgraphVolume"

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
    chainFilter?: string,
    extraN30DType?: string,
) => `generateCleanRecords/${adaptorType}/${adapterId}/${versionKey}/${protocolType}/${adaptorRecordType}_${chainFilter}_${extraN30DType}`

export default async (adapter: ProtocolAdaptor, adaptorRecordType: AdaptorRecordType, adaptorType: AdapterType, chainFilter?: string, onError?: (e: Error) => Promise<void>, {
    isApi2RestServer = false
} = {}): Promise<ProtocolAdaptorSummary> => {
    const getAdaptorRecord = isApi2RestServer ? getAdaptorRecord2 : _getAdaptorRecord
    // console.info("Generating summary for:", adapter.name, "with params", adaptorRecordType, adaptorType, chainFilter)
    try {
        // Get all records from db
        const timestamp = getUniqStartOfTodayTimestamp(new Date()) - ONE_DAY_IN_SECONDS
        let adaptorRecordsRaw = await getAdaptorRecord({ adaptorType, adapter, type: adaptorRecordType, mode: 'ALL', })
        const rawTotalRecord = ACCOMULATIVE_ADAPTOR_TYPE[adaptorRecordType]
            ? await getAdaptorRecord({ adaptorType, adapter, type: ACCOMULATIVE_ADAPTOR_TYPE[adaptorRecordType], mode: "LAST" }).catch(_e => { }) as AdaptorRecord | undefined
            : undefined
        let protocolsKeys = [adapter.module]
        if (adapter?.enabled && adapter.versionKey) {
            protocolsKeys = [adapter.versionKey]
        }
        const chainFilterArray = chainFilter ? [chainFilter] : undefined
        const totalRecord = rawTotalRecord?.getCleanAdaptorRecord(chainFilterArray, protocolsKeys[0])
        // This check is made to infer AdaptorRecord[] type instead of AdaptorRecord type
        if (!(adaptorRecordsRaw instanceof Array)) throw new Error("Wrong volume queried")
        if (adaptorRecordsRaw.length === 0) throw new Error(`${adapter.name} ${adapter.id} has no records stored${chainFilter ? ` for chain ${chainFilter}` : ''}`)
        let lastRecordRaw = adaptorRecordsRaw[adaptorRecordsRaw.length - 1]
        const cleanLastReacord = JSON.parse(JSON.stringify(lastRecordRaw.getCleanAdaptorRecord(chainFilterArray, protocolsKeys[0])))
        if (sumAllVolumes(lastRecordRaw.data) === 0) {
            lastRecordRaw = adaptorRecordsRaw[adaptorRecordsRaw.length - 2]
            adaptorRecordsRaw[adaptorRecordsRaw.length - 1].data = adaptorRecordsRaw[adaptorRecordsRaw.length - 2].data
        }

        // Get extra revenue
        const extraTypes: IJSON<number | null> = {}
        for (const recordType of getExtraTypes(adaptorType)) {
            const value = await getAdaptorRecord({ adaptorType, adapter, type: recordType, mode: "TIMESTAMP", timestamp: lastRecordRaw.timestamp }).catch(_e => { }) as AdaptorRecord | undefined
            const cleanRecord = value?.getCleanAdaptorRecord(chainFilterArray, protocolsKeys[0])
            if (AdaptorRecordTypeMapReverse[recordType]) {
                extraTypes[AdaptorRecordTypeMapReverse[recordType]] = cleanRecord ? sumAllVolumes(convertDataToUSD(cleanRecord.data)) : null
            }
        }

        const extraN30DTypes: IJSON<number | null> = {}
        for (const recordType of getExtraN30DTypes(adaptorType)) {
            const _adaptorRecordsRawN30D = await getAdaptorRecord({ adaptorType, adapter, type: recordType }).catch(_e => { }) as AdaptorRecord[] | undefined
            if (!_adaptorRecordsRawN30D) continue;
            if (_adaptorRecordsRawN30D?.length && _adaptorRecordsRawN30D?.length === 0) continue;
            const startTimestamp = adapter.startFrom
            const startIndex = startTimestamp ? _adaptorRecordsRawN30D.findIndex((ar: any) => ar.timestamp === startTimestamp) : -1
            let _adaptorRecordsN30D = _adaptorRecordsRawN30D.slice(startIndex + 1)
            const getCleanRecords = () => generateCleanRecords(
                _adaptorRecordsN30D,
                adapter.chains,
                protocolsKeys,
                chainFilter,
                adapter.config?.cleanRecordsConfig
            )
            let cleanRecordsN30D
            if (isApi2RestServer)
                cleanRecordsN30D = getCleanRecords()
            else
                cleanRecordsN30D = await getCachedReturnValue(
                    getAdapterKey(adapter.id, adapter.versionKey ?? adapter.module, recordType, adaptorType, adapter.protocolType, chainFilter, `${recordType}_30d`),
                    getCleanRecords as any
                )
            const lastAvailableDataTimestamp = _adaptorRecordsN30D[_adaptorRecordsN30D.length - 1].timestamp
            const yesterdaysCleanTimestamp = getTimestampAtStartOfDayUTC((Date.now() - ONE_DAY_IN_SECONDS * 1000) / 1000)
            const lastDaysExtrapolation = ((yesterdaysCleanTimestamp - lastAvailableDataTimestamp) / ONE_DAY_IN_SECONDS) < 5
            const stats = getStats(adapter, _adaptorRecordsN30D, cleanRecordsN30D.cleanRecordsMap, lastAvailableDataTimestamp)
            if (AdaptorRecordTypeMapReverse[recordType]) {
                const extraN30DField = `${AdaptorRecordTypeMapReverse[recordType]}`.replace('daily', '');
                const firstLetter = extraN30DField.charAt(0)
                const firstLetterCap = firstLetter.toLowerCase()
                const remainingLetters = extraN30DField.slice(1)

                const key = `${firstLetterCap}${remainingLetters}30d`
                extraN30DTypes[key] = (adapter.disabled || !lastDaysExtrapolation) ? null : stats.total30d;
            }
        }

        const startTimestamp = adapter.startFrom
        const startIndex = startTimestamp ? adaptorRecordsRaw.findIndex(ar => ar.timestamp === startTimestamp) : -1
        let adaptorRecords = adaptorRecordsRaw.slice(startIndex + 1)
        // const debugObject = {
        //     adapter,
        //     startIndex, startTimestamp, adapterCount: adaptorRecords.length, adaptorRecordsRawCount: adaptorRecordsRaw.length,
        //     key: getAdapterKey(adapter.id, adapter.versionKey ?? adapter.module, adaptorRecordType, adaptorType, adapter.protocolType, chainFilter)
        // }


        // Clean data by chain
        // console.info("Cleaning records", adapter.name, adapter.id, adapter.module, adaptorRecords.length, adapter.config)
        const getCleanRecords = () => generateCleanRecords(
            adaptorRecords,
            adapter.chains,
            protocolsKeys,
            chainFilter,
            adapter.config?.cleanRecordsConfig
        )
        let cleanRecords
        if (isApi2RestServer)
            cleanRecords = getCleanRecords()
        else
            cleanRecords = await getCachedReturnValue(
                getAdapterKey(adapter.id, adapter.versionKey ?? adapter.module, adaptorRecordType, adaptorType, adapter.protocolType, chainFilter),
                getCleanRecords as any)
        // console.info("Cleaning records OK", adapter.name, adapter.id, adapter.module, cleanRecords.cleanRecordsArr.length)

        adaptorRecords = cleanRecords.cleanRecordsArr
        if (adaptorRecords.length === 0) {
            // console.log(debugObject, isApi2RestServer, JSON.stringify(adaptorRecordsRaw.slice(0, 3), null, 2))
            throw new Error(`${adapter.name} ${adapter.id} has no records stored${chainFilter ? ` for chain ${chainFilter}` : ''}`)
        }

        // Calc stats with last available data
        const yesterdaysCleanTimestamp = getTimestampAtStartOfDayUTC((Date.now() - ONE_DAY_IN_SECONDS * 1000) / 1000)
        const lastAvailableDataTimestamp = adaptorRecords[adaptorRecords.length - 1].timestamp
        const lastDaysExtrapolation = ((yesterdaysCleanTimestamp - lastAvailableDataTimestamp) / ONE_DAY_IN_SECONDS) < 5
        const stats = getStats(adapter, adaptorRecords, cleanRecords.cleanRecordsMap, lastAvailableDataTimestamp)

        if (yesterdaysCleanTimestamp > lastAvailableDataTimestamp || cleanLastReacord == null || Object.keys(cleanLastReacord.data).length < adapter.chains.length) {
            const storedChains = Object.keys(cleanLastReacord?.data ?? {})
            const missingChains = adapter.chains.filter(chain => !storedChains.includes(chain))
            if (onError && !isApi2RestServer) onError(new Error(`
Adapter: ${adapter.name} [${adapter.id}]
${AdaptorRecordTypeMapReverse[adaptorRecordType]} not updated${missingChains.length > 0 ? ` with missing chains: ${missingChains.join(', ')}` : ''}
${formatTimestampAsDate(yesterdaysCleanTimestamp.toString())} <- Report date
${formatTimestampAsDate(lastAvailableDataTimestamp.toString())} <- Last date found
${sumAllVolumes(convertDataToUSD(lastRecordRaw.data))} <- Last computed ${AdaptorRecordTypeMapReverse[adaptorRecordType]}
Last record found\n${JSON.stringify(lastRecordRaw.data, null, 2)}
`))
        }

        // Now we add adaptorRecordType to the extra types object
        extraTypes[AdaptorRecordTypeMapReverse[adaptorRecordType]] = stats.total24h

        // And calculate the missing types
        const rules = getRules(adaptorType) ?? {}
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
            defillamaId: adapter.defillamaId,
            name: adapter.name,
            slug: adapter.name.split(" ").join("-").toLowerCase(),
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
            total1y: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.total1y,
            average1y: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.average1y,
            totalAllTime: totalRecord ? sumAllVolumes(convertDataToUSD(totalRecord.data)) : null,
            breakdown24h: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.breakdown24h,
            config: getConfigByType(adaptorType, adapter.module),
            chains: chainFilter ? [getDisplayChainName(chainFilter)] : adapter.chains.map(getDisplayChainName),
            protocolType: adapter.protocolType ?? ProtocolType.PROTOCOL,
            methodologyURL: adapter.methodologyURL,
            methodology: adapter.methodology,
            allAddresses: adapter.allAddresses,
            parentProtocol: adapter.parentProtocol,
            latestFetchIsOk: adapter?.config?.latestFetchIsOk ?? true,
            versionKey: adapter.versionKey,
            ...Object.entries(extraTypes).reduce((acc, [key, value]) => {
                acc[key] = (adapter.disabled || !lastDaysExtrapolation) ? null : value
                return acc
            }, {} as typeof extraTypes),
            ...Object.entries(extraN30DTypes).reduce((acc, [key, value]) => {
                acc[key] = (adapter.disabled || !lastDaysExtrapolation) ? null : value
                return acc
            }, {} as typeof extraN30DTypes),
            spikes: cleanRecords.spikesLogs.length > 0 ? ["Spikes detected", ...cleanRecords.spikesLogs].join('\n') : undefined,
            totalVolume7d: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.totalVolume7d,
            totalVolume30d: (adapter.disabled || !lastDaysExtrapolation) ? null : stats.totalVolume30d,
        }
    } catch (error) {
        // TODO: handle better errors
        if (onError) onError(error as Error)
        return {
            defillamaId: adapter.id,
            name: adapter.name,
            slug: adapter.name.split(" ").join("-").toLowerCase(),
            module: adapter.module,
            disabled: adapter.disabled,
            displayName: adapter.displayName,
            config: getConfigByType(adaptorType, adapter.module),
            category: adapter.category,
            logo: adapter.logo,
            protocolType: adapter.protocolType ?? ProtocolType.PROTOCOL,
            methodologyURL: adapter.methodologyURL,
            methodology: adapter.methodology,
            latestFetchIsOk: adapter?.config?.latestFetchIsOk ?? false,
            versionKey: adapter.versionKey,
            total24h: null,
            total48hto24h: null,
            total7d: null,
            total30d: null,
            total14dto7d: null,
            total60dto30d: null,
            total1y: null,
            average1y: null,
            totalAllTime: null,
            breakdown24h: null,
            change_1d: null,
            records: null,
            recordsMap: null,
            change_7d: null,
            change_1m: null,
            change_7dover7d: null,
            change_30dover30d: null,
            chains: chainFilter ? [getDisplayChainName(chainFilter)] : adapter.chains.map(getDisplayChainName),
            spikes: undefined,
            totalVolume7d: null,
            totalVolume30d: null,
        }
    }
}


const getStats = (adapter: ProtocolAdaptor, adaptorRecordsArr: AdaptorRecord[], adaptorRecordsMap: IJSON<AdaptorRecord>, baseTimestamp: number): IGeneralStats => {
    return {
        change_1d: calcNdChange(adaptorRecordsMap, 1, baseTimestamp, true).ndChange,
        change_7d: calcNdChange(adaptorRecordsMap, 7, baseTimestamp, true).ndChange,
        change_1m: calcNdChange(adaptorRecordsMap, 30, baseTimestamp, true).ndChange,
        totalVolume7d: calcNdChange(adaptorRecordsMap, 7, baseTimestamp, true).totalNd,
        totalVolume30d: calcNdChange(adaptorRecordsMap, 30, baseTimestamp, true).totalNd,
        ...getWoWStats([{
            recordsMap: adaptorRecordsMap
        }], undefined, baseTimestamp),
        total24h: adapter.disabled ? null : sumAllVolumes(adaptorRecordsArr[adaptorRecordsArr.length - 1].data),
        breakdown24h: adapter.disabled ? null : adaptorRecordsArr[adaptorRecordsArr.length - 1].data,
        total48hto24h: adapter.disabled ? null : calcNdChange(adaptorRecordsMap, 1, baseTimestamp, true).totalNd
    }
}
