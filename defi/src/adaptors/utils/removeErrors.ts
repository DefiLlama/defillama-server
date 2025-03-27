import { IRecordAdaptorRecordData } from "../db-utils/adaptor-record"

// TODO: this can be more optimized and it should!!
export default (data: IRecordAdaptorRecordData) => Object.entries(data).reduce((acc, [chain, volume]) => {
    if (!volume) return acc
    const entries = Object.entries(volume)
    if (entries.length === 1 && entries[0][0] === 'error' || chain === 'eventTimestamp') return acc
    const cleanChainData = entries.reduce((pacc, [prot, value]) => {
        if (prot !== 'error' && (typeof value === 'number' || typeof value === 'object'))
            pacc[prot] = value
        return pacc
    }, {} as {
        [protocolVersion: string]: number,
    })
    if (Object.keys(cleanChainData).length > 0)
        acc[chain] = cleanChainData
    return acc
}, {} as IRecordAdaptorRecordData)

export const getErrorData = (data: IRecordAdaptorRecordData) => {
    let errorObject: any = {}
    try {
        errorObject = Object.entries(data).reduce((acc, [chain, volume]) => {
            if (typeof volume !== 'object') return acc
            if (volume.error) acc[chain] = volume.error
            return acc
        }, {} as any)
    } catch (e) {
        console.error(e)
    }
    return Object.keys(errorObject).length > 0 ? errorObject : null
}