import "./../setup.ts"
import { getVolume, storeVolume, Volume, VolumeType } from "../../data/volume"
import dexAdapters from '../../dexAdapters'
import { IRecordVolumeData } from "../../handlers/storeDexVolume"
import { formatTimestampAsDate } from "../../../utils/date"

interface AveragedRecord {
    [key: string]: IRecordVolumeData | boolean | { [protocolVersion: string]: number | string } | undefined
}

(async () => {
    const eventTimestamp = Math.trunc((Date.now()) / 1000)
    const ONE_DAY_IN_SECONDS = 60 * 60 * 24
    const MAX_SPIKE = 1000000000
    const DEX_NAME = 'terraswap'
    console.log("Averaging...")
    const dex = dexAdapters.find(dex => dex.volumeAdapter === DEX_NAME)
    if (!dex) throw new Error(`Couldn´t find dex ${DEX_NAME}`)
    const allVolumes = await getVolume(dex.id, VolumeType.dailyVolume, "ALL")
    if (allVolumes instanceof Array) {
        for (const volume of allVolumes) {
            const data2Check = volume.data
            delete data2Check.eventTimestamp
            //console.log(data2Check)
            const newVolume = Object.entries(data2Check).reduce((acc, [chain, volumes]) => {
                let averaged = false
                return {
                    ...acc,
                    [chain]: Object.entries(volumes).reduce((acc, [version, volumeValue]) => {
                        let value: string | number = volumeValue
                        if (typeof volumeValue === 'number' && volumeValue > MAX_SPIKE) {
                            console.log(volume.keys(), chain, version)
                            averaged = true
                            let prevValue
                            let nextValue
                            for (let i = 0; i<10; i++) {
                                if (prevValue === undefined || prevValue>MAX_SPIKE) {
                                    const previousDay = allVolumes.find(v => v.timestamp === volume.timestamp - ONE_DAY_IN_SECONDS*(i+1))
                                    prevValue = previousDay?.data[chain][version]
                                }
                                if (nextValue === undefined || nextValue>MAX_SPIKE) {
                                    const nextDay = allVolumes.find(v => v.timestamp === volume.timestamp + ONE_DAY_IN_SECONDS*(i+1))
                                    nextValue = nextDay?.data[chain][version]
                                }
                                if (prevValue!==undefined && prevValue<MAX_SPIKE && nextValue!==undefined && nextValue<MAX_SPIKE) break
                            }
                            if (prevValue && nextValue) {
                                if (typeof prevValue === 'number' && typeof nextValue === 'number')
                                    value = (prevValue + nextValue) / 2
                            } else {
                                value = typeof prevValue === "number" ? prevValue : typeof nextValue === "number" ? nextValue : value
                                console.log("One undefined!!")
                            }
                            if (volumeValue === value) {
                                value = `Spike couldn't be averaged. Original value ${volumeValue}`
                            }
                            if (volume.data[chain][version] !== value) console.log(`Data changed for ${JSON.stringify(volume.keys().PK)} at ${formatTimestampAsDate(String(volume.timestamp))} with keys ${JSON.stringify(volume.keys())} \nOLD: ${volume.data[chain][version]}\nNEW: ${value}`)
                        }
                        return {
                            ...acc,
                            [version]: value
                        }
                    }, {} as { [protocolVersion: string]: number | string }),
                    averaged: acc.averaged === true ? acc.averaged : averaged,
                }
            }, {} as AveragedRecord)
            if (newVolume.averaged) {
                delete newVolume.averaged
                /*                 const oldItem = volume.toItem()
                                console.log("storing", {
                                    ...oldItem,
                                    PK: `${oldItem.PK}#prev#${eventTimestamp}`
                                })
                                await storeVolume(Volume.fromItem({
                                    ...oldItem,
                                    SK: `${oldItem.SK}#prev#${eventTimestamp}`
                                } as DynamoDB.AttributeMap), Date.now() / 1000) */
                const nv = new Volume(volume.type, volume.dexId, volume.timestamp, newVolume as IRecordVolumeData)
                console.log("Storing new", nv.keys(), newVolume)
                await storeVolume(nv, eventTimestamp)
            }
        }
    }
    else
        throw new Error(`Unexpected result`)
})()