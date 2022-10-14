import { IRecordVolumeData } from "../handlers/storeDexVolume"

export default (data: IRecordVolumeData) => Object.entries(data).reduce((acc, [chain, volume]) => {
    const entries = Object.entries(volume)
    if (entries.length === 1 && entries[0][0] === 'error' || chain === 'eventTimestamp') return acc
    acc[chain] = entries.reduce((pacc, [prot, value]) => {
        if (prot !== 'error' && typeof value === 'number' && value > 0)
            pacc[prot] = value
        return pacc
    }, {} as {
        [protocolVersion: string]: number,
    })
    return acc
}, {} as IRecordVolumeData)