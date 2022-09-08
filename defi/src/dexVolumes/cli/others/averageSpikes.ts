import "./../setup.ts"
import { getVolume, VolumeType } from "../../data/volume"
import dexAdapters from '../../dexAdapters'

(async () => {
    const ONE_DAY_IN_SECONDS = 60 * 60 * 24
    const MAX_SPIKE = 5 * 1000000000 // 5 * 1bn
    const DEX_NAME = 'dodo'
    console.log("Averaging...")
    const dex = dexAdapters.find(dex => dex.volumeAdapter === DEX_NAME)
    if (!dex) throw new Error(`Couldn´t find dex ${DEX_NAME}`)
    const allVolumes = await getVolume(dex.id, VolumeType.dailyVolume, "ALL")
    console.log(allVolumes)
    if (allVolumes instanceof Array) {
        for (const volume of allVolumes) {
            const data2Check = volume.data
            delete data2Check.eventTimestamp
            //console.log(data2Check)
            const newData = Object.entries(data2Check).reduce((acc, [chain, volumes]) => {
                return {
                    ...acc,
                    [chain]: Object.entries(volumes).reduce((acc, [version, volumeValue]) => {
                        let value = volumeValue
                        if (typeof value === 'number' && volumeValue > MAX_SPIKE) {
                            const previousDay = allVolumes.find(v => v.timestamp === volume.timestamp - ONE_DAY_IN_SECONDS)
                            const nextDay = allVolumes.find(v => v.timestamp === volume.timestamp + ONE_DAY_IN_SECONDS)
                            const prevValue = previousDay?.data[chain][version]
                            const nextValue = nextDay?.data[chain][version]
                            if (prevValue && nextValue) {
                                if (typeof prevValue === 'number' && typeof nextValue === 'number')
                                    value = (prevValue + nextValue) / 2
                                console.log(`Averaged! ${volumeValue} on ${new Date(volume.timestamp * 1000)} to ${value}, ${volumeValue === value}`)
                            } else {
                                value = typeof prevValue === "number" ? prevValue : typeof nextValue === "number" ? nextValue : value
                            }
                            if (volumeValue === value) {
                                console.log(prevValue, nextValue, volume.timestamp)
                            }
                        }
                        return {
                            ...acc,
                            [version]: value
                        }
                    }, {})
                }
            }, {} as typeof volume.data)
        }
    }
    else
        throw new Error(`Unexpected result`)
})()