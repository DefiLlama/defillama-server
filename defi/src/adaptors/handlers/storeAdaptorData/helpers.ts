import { IRunAdapterResponseFulfilled, IRunAdapterResponseRejected } from "@defillama/dimension-adapters/adapters/utils/runAdapter"
import { IJSON } from "../../data/types"
import { RawRecordMap } from "../../db-utils/adaptor-record"


// Process ok results from running adapter
export function processFulfilledPromises(fulfilledResults: IRunAdapterResponseFulfilled[], rawRecord: RawRecordMap, module: string, ATTRIBUTE_KEYS: IJSON<string>) {
    const results = fulfilledResults as unknown as IJSON<string | number | undefined>[]
    for (const [RECORD_TYPE, ATTRIBUTE] of Object.entries(ATTRIBUTE_KEYS)) {
        for (const result of results) {
            const value = result[ATTRIBUTE]
            if (value !== undefined && result.chain) {
                if (!rawRecord[RECORD_TYPE]) rawRecord[RECORD_TYPE] = {}
                const recordChain = rawRecord[RECORD_TYPE][result.chain]
                if (typeof recordChain === 'number') return
                rawRecord[RECORD_TYPE] = {
                    ...rawRecord[RECORD_TYPE],
                    [result.chain]: {
                        ...recordChain,
                        [module]: typeof value === 'object' ? value : +value
                    }
                }
            }
        }
    }
}

// Process failed results from running adapter

export const STORE_ERROR = "STORE_ERROR"
export function processRejectedPromises(rejectedResults: IRunAdapterResponseRejected[], rawRecord: RawRecordMap, dexName: string, ATTRIBUTE_KEYS: IJSON<string>) {
    for (const [RECORD_TYPE, ATTRIBUTE] of Object.entries(ATTRIBUTE_KEYS)) {
        for (const result of rejectedResults) {
            console.error(`${STORE_ERROR}:${dexName}:Rejected: \nTIMESTAMP: ${result.timestamp}`, result)
            if (!rawRecord[RECORD_TYPE]) rawRecord[RECORD_TYPE] = {}
            const recordChain = rawRecord[RECORD_TYPE][result.chain]
            if (typeof recordChain === 'number') return
            rawRecord[RECORD_TYPE] = {
                ...rawRecord[RECORD_TYPE],
                [result.chain]: {
                    ...recordChain,
                    error: result.error.message
                }
            }
        }
    }
}