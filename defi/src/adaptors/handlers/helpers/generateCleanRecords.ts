import { formatTimestampAsDate } from "../../../utils/date"
import { IJSON } from "../../data/types"
import { AdaptorRecord, IRecordAdaptorRecordData } from "../../db-utils/adaptor-record"
import { formatChainKey } from "../../utils/getAllChainsFromAdaptors"
import { ONE_DAY_IN_SECONDS } from "../getProtocol"

/**
 * Returns a normalized list of adaptor records.
 * If there's missing data it tries to average it based on previos/next available data.
 */

export default (adaptorRecords: AdaptorRecord[], chainsRaw: string[], protocols: string[], chainFilterRaw?: string) => {
    const chains = chainsRaw.map(formatChainKey)
    const chainFilter = chainFilterRaw ? formatChainKey(chainFilterRaw) : undefined
    // Get adaptor type for all records
    const type = adaptorRecords[0].type
    // Get adaptor id for all records
    const adaptorId = adaptorRecords[0].adaptorId
    // Process adaptors. Should be changed to process based on timestamps instead of stored records
    const processed = adaptorRecords.reduce((acc, adaptorRecord, currentIndex, array) => {
        // Let's work with a clean record
        const cleanRecord = adaptorRecord.getCleanAdaptorRecord(chainFilter ? [chainFilter] : chains)
        // Here will be stored the normalized data
        const generatedData = {} as IRecordAdaptorRecordData
        // Get current timestamp we are working with
        let timestamp = cleanRecord?.timestamp
        if (!timestamp) {
            const all = Object.values(acc.lastDataRecord)
            if (all.length === 0 || !all[0]) return acc
            timestamp = all[0].timestamp + ONE_DAY_IN_SECONDS
        }
        // It goes through all combinations of chain-protocol
        chains.reduce((acc, chain) => ([...acc, ...protocols.map(prot => `${chain}#${prot}`)]), [] as string[]).forEach(chainProt => {
            const chain = chainProt.split("#")[0]
            const protocol = chainProt.split("#")[1]
            const lastRecord = acc.lastDataRecord[chainProt]
            let nextRecord = acc.nextDataRecord[chainProt]
            // If no clean record is found for current timestamp and the chain-prot hasn't been found before, it skips this chain-prot
            if (cleanRecord === null && (!lastRecord || !lastRecord.data[chain])) {
                return
            }
            // If clean data is found, it checks if there's available value for chain-protocol and adds it to generatedData
            if (cleanRecord !== null && cleanRecord.data[chain]) {
                const chainData = cleanRecord.data[chain]
                if (typeof chainData === 'number') return
                const genChainData = generatedData[chain]
                if (chainData[protocol] !== undefined && !Number.isNaN(chainData[protocol])) {
                    generatedData[chain] = {
                        ...(typeof genChainData === "number" ? undefined : genChainData),
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
                for (let i = currentIndex; i < (array.length - 1); i++) {
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

        // Once we have generated correct data
        if (Object.keys(generatedData).length === 0) return acc
        const newGen = new AdaptorRecord(
            type,
            adaptorId,
            timestamp,
            generatedData
        )
        acc.lastDataRecord = chains.reduce((acc, chain) => ([...acc, ...protocols.map(prot => `${chain}#${prot}`)]), [] as string[]).reduce((acc, chainProt) => ({ ...acc, [chainProt]: newGen }), {})
        acc.adaptorRecords.push(newGen)
        acc.recordsMap[String(newGen.timestamp)] = newGen
        return acc
    }, {
        adaptorRecords: [] as AdaptorRecord[],
        lastDataRecord: chains.reduce((acc, chain) => ({ ...acc, [chain]: adaptorRecords[0].getCleanAdaptorRecord(chainFilter ? [chainFilter] : chains) }), {}),
        nextDataRecord: {},
        recordsMap: {}
    } as {
        lastDataRecord: { [chain: string]: AdaptorRecord | undefined }
        nextDataRecord: { [chainProt: string]: AdaptorRecord | undefined }
        adaptorRecords: AdaptorRecord[],
        recordsMap: IJSON<AdaptorRecord> // Might be good idea to merge it with adaptorRecords list since its the same
    })
    return {
        cleanRecordsArr: processed.adaptorRecords,
        cleanRecordsMap: processed.recordsMap
    }
}