import { AdapterType } from "@defillama/dimension-adapters/adapters/types"
import { formatTimestampAsDate } from "../../../utils/date"
import { IJSON } from "../../data/types"
import { AdaptorRecord, IRecordAdaptorRecordData } from "../../db-utils/adaptor-record"
import { formatChainKey } from "../../utils/getAllChainsFromAdaptors"
import { sendDiscordAlert } from "../../utils/notify"
import { calcNdChange } from "../../utils/volumeCalcs"
import { ONE_DAY_IN_SECONDS } from "../getProtocol"
import { convertDataToUSD, IGetHistoricalPricesResponse } from "./convertRecordDataCurrency"

/**
 * Returns a normalized list of adaptor records.
 * If there's missing data it tries to average it based on previos/next available data.
 */

export default async (adaptorRecords: AdaptorRecord[], chainsRaw: string[], protocols: string[], chainFilterRaw?: string) => {
    const spikesLogs: string[] = []
    const chains = chainsRaw.map(formatChainKey)
    const chainFilter = chainFilterRaw ? formatChainKey(chainFilterRaw) : undefined
    // Get adaptor type for all records
    const type = adaptorRecords[0].type
    // Get adaptor id for all records
    const adaptorId = adaptorRecords[0].adaptorId
    // Process adaptors. Should be changed to process based on timestamps instead of stored records
    const processed = await adaptorRecords.reduce(async (accP, adaptorRecord, currentIndex, array) => {
        const acc = await accP
        // Let's work with a clean record
        const cleanRecord = adaptorRecord.getCleanAdaptorRecord(chainFilter ? [chainFilter] : chains)
        // Here will be stored the normalized data (aka data with no errors and if missing, extrapolation of that day)
        const generatedData = {} as IRecordAdaptorRecordData
        // Get current timestamp we are working with
        let timestamp = cleanRecord?.timestamp
        if (!timestamp) {
            const all = Object.values(acc.lastDataRecord)
            if (all.length === 0 || !all[0]) return acc
            timestamp = all[0].timestamp + ONE_DAY_IN_SECONDS
        }
        const missingDayData: IJSON<IRecordAdaptorRecordData> = {} as IJSON<IRecordAdaptorRecordData>
        // It goes through all combinations of chain-protocol
        chains.reduce((acc, chain) => ([...acc, ...protocols.map(prot => `${chain}#${prot}`)]), [] as string[]).forEach(chainProt => {
            const chain = chainProt.split("#")[0]
            const protocol = chainProt.split("#")[1]
            const lastRecord = acc.lastDataRecord[chainProt]
            let nextRecord = acc.nextDataRecord[chainProt]
            // If no clean record is found for current timestamp and the chain-prot hasn't been found before, it skips this chain-prot, which means we cant extrapolate/no data up to this timestamp
            if (cleanRecord === null && (!lastRecord || !lastRecord.data[chain])) {
                return
            }
            // Checking if we skipped a day with no record
            Object.entries(acc.lastDataRecord).forEach(async ([chainprot, record]) => {
                const [chain, _prot] = chainprot.split("#")
                if (!timestamp || !record) return
                const gaps = (timestamp - record.timestamp) / ONE_DAY_IN_SECONDS
                for (let i = 1; i < gaps; i++) {
                    const recordData = record.data?.[chain]
                    const prevData = missingDayData[String(record.timestamp + (ONE_DAY_IN_SECONDS * i))]?.[chain]
                    missingDayData[String(record.timestamp + (ONE_DAY_IN_SECONDS * i))] = {
                        ...missingDayData[String(record.timestamp + (ONE_DAY_IN_SECONDS * i))],
                        [chain]: {
                            ...(typeof prevData === 'number' ? undefined : prevData),
                            ...(typeof recordData === 'number' ? undefined : recordData),
                        }
                    }
                }
            })

            // If clean data is found, it checks if there's available value for chain-protocol and adds it to generatedData
            if (cleanRecord !== null && cleanRecord.data[chain]) {
                const chainData = cleanRecord.data[chain]
                // chainData should be an object -> {protocolVersion: data}, if its a number then skip
                if (typeof chainData === 'number') return
                const genChainData = generatedData[chain]
                if (chainData[protocol] !== undefined && !Number.isNaN(chainData[protocol])) {
                    generatedData[chain] = {
                        ...(typeof genChainData === "number" ? undefined : genChainData), // this check is needed to avoid ts errors, but should never be number
                        [protocol]: chainData[protocol]
                    }
                    if (lastRecord && lastRecord.timestamp != cleanRecord.timestamp) {
                        acc.lastDataRecord[chainProt] = cleanRecord
                    }
                    return
                }
            }
            // If clean data is not found but previously there was available data for that chain-prot, it tries to fill it
            // Checks if current nextDataRecord is still valid, if not valid looks for next one
            if (!nextRecord || (lastRecord && nextRecord && (nextRecord.timestamp <= lastRecord.timestamp))) {
                // Resets nextRecord
                acc.nextDataRecord[chainProt] = undefined
                nextRecord = acc.nextDataRecord[chainProt]
                // Note, limited the lookup to up maxGaps2Cover
                for (let i = currentIndex; i < Math.min((array.length - 1), 100); i++) {
                    const cR = array[i + 1].getCleanAdaptorRecord(chainFilter ? [chainFilter] : chains)
                    const protDataChain = cR?.data[chain]
                    if (cR !== null && typeof protDataChain === 'object' && protDataChain[protocol]) {
                        acc.nextDataRecord[chainProt] = cR
                        nextRecord = acc.nextDataRecord[chainProt]
                        break
                    }
                }
            }
            // If next record is found, then get previous/next value and fill missing record averaging it
            if (lastRecord && acc.nextDataRecord[chainProt] && nextRecord && nextRecord.data[chain] && lastRecord.data[chain]) {
                const nGaps = (nextRecord.timestamp - lastRecord.timestamp) / ONE_DAY_IN_SECONDS

                const prevChainData = lastRecord.data[chain]
                const nextChainData = nextRecord.data[chain]
                if (typeof prevChainData === 'number' || typeof nextChainData === 'number') return
                const prevValue = +prevChainData[protocol]
                const nextValue = +nextChainData[protocol]
                if (Number.isNaN(prevValue) || Number.isNaN(nextValue)) return

                const genChainData = generatedData[chain]
                generatedData[chain] = {
                    ...(typeof genChainData === "number" ? undefined : genChainData),
                    [protocol]: prevValue + ((nextValue - prevValue) / nGaps)
                }
            }
        })

        // If day with no record skipped, filling with prev day
        Object.entries(missingDayData).forEach(([timestamp, data]) => {
            const missingDay = new AdaptorRecord(
                type,
                adaptorId,
                +timestamp,
                data
            )
            acc.adaptorRecords.push(missingDay)
            acc.recordsMap[String(missingDay.timestamp)] = missingDay
        })

        // Once we have generated correct data
        if (Object.keys(generatedData).length === 0) return acc
        const newGen = new AdaptorRecord(
            type,
            adaptorId,
            timestamp,
            await convertDataToUSD(generatedData, timestamp)
        )

        checkSpikes(acc.lastDataRecord, newGen, spikesLogs)

        acc.lastDataRecord = chains.reduce((acc, chain) => ([...acc, ...protocols.map(prot => `${chain}#${prot}`)]), [] as string[]).reduce((acc, chainProt) => ({ ...acc, [chainProt]: newGen }), {})
        acc.adaptorRecords.push(newGen)
        acc.recordsMap[String(newGen.timestamp)] = newGen
        return acc
    }, Promise.resolve({
        adaptorRecords: [] as AdaptorRecord[],
        lastDataRecord: chains.reduce((acc, chain) => ({ ...acc, [chain]: adaptorRecords[0].getCleanAdaptorRecord(chainFilter ? [chainFilter] : chains) }), {}),
        nextDataRecord: {},
        recordsMap: {}
    } as {
        lastDataRecord: { [chain: string]: AdaptorRecord | undefined }
        nextDataRecord: { [chainProt: string]: AdaptorRecord | undefined }
        adaptorRecords: AdaptorRecord[],
        recordsMap: IJSON<AdaptorRecord> // Might be good idea to merge it with adaptorRecords list since its the same
    }))
    return {
        cleanRecordsArr: processed.adaptorRecords,
        cleanRecordsMap: processed.recordsMap,
        spikesLogs
    }
}

function checkSpikes(lastDataRecord: IJSON<AdaptorRecord | undefined>, newGen: AdaptorRecord, spikesLogs: string[]) {
    Object.entries(lastDataRecord).forEach(([key, record]) => {
        const [chain, protocol] = key.split('#')
        const chainData = newGen.data[chain]
        if (chain && protocol && chainData && typeof chainData !== 'number' && chainData[protocol] && record) {
            const recordChainData = record.data[chain]
            if (!recordChainData || typeof recordChainData === 'number') return
            const chg1d = calcNdChange({
                [record.timestamp.toString()]: new AdaptorRecord(
                    newGen.type,
                    newGen.adaptorId,
                    record.timestamp,
                    {
                        [chain]: {
                            [protocol]: recordChainData[protocol]
                        }
                    }
                ),
                [newGen.timestamp.toString()]: new AdaptorRecord(
                    newGen.type,
                    newGen.adaptorId,
                    newGen.timestamp,
                    {
                        [chain]: {
                            [protocol]: chainData[protocol]
                        }
                    }
                )
            }, 1, newGen.timestamp)
            if (chg1d && chg1d > 1000 && chainData[protocol] > 10000000) {
                spikesLogs.push(`Spike found!\n1dChange: ${chg1d}\nTimestamp: ${newGen.timestamp}\nRecord: ${JSON.stringify(newGen, null, 2)}`)
                const okChainData = newGen.data[chain]
                if (okChainData && typeof okChainData !== 'number')
                    newGen.data = {
                        ...newGen.data,
                        [chain]: {
                            ...okChainData,
                            [protocol]: recordChainData[protocol]
                        }
                    }
            }
        }
    })
}