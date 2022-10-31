import "../setup.ts"
import fs from 'fs'
import path from 'path';
import { getVolume, storeVolume, Volume, VolumeType } from '../../db-utils/volume';
import { CHAIN } from "../../../../adapters/helpers/chains";

interface IBackupData {
    [timestamp: string]: Volume | string
}

(async () => {
    const dexId = "491"
    const protocolId = "terraswap"
    const chain = 'terra'

    const processData = (dataSet: IBackupData = {}, backUp: IBackupData = {}, _newDaily: IBackupData = {}, type: VolumeType) => {
        const newDaily: IBackupData = _newDaily
        for (const [timestamp, volume] of Object.entries(dataSet)) {
            if (!timestamp || volume === undefined) continue
            const t = new Date((+timestamp) * 1000).getTime() / 1000
            const legacyVolume = backUp[t.toString()] ?? dataSet[t.toString()]

            const newProt = typeof volume === 'string' ? {
                [protocolId]: +volume
            } : undefined
            //console.log(typeof legacyVolume, !newDaily[t.toString()])
            if (legacyVolume instanceof Volume && !newDaily[t.toString()] && legacyVolume.type === type) {
                const obj = {
                    ...legacyVolume.data[chain],
                    //"v2": legacyVolume.data[chain]['pancakeswap'],
                    ...newProt
                }
                // @ts-ignore
                delete obj['pancakeswap']
                newDaily[t.toString()] = new Volume(type, dexId, t, {
                    ...legacyVolume.data,
                    [chain]: obj
                })
            } else if (typeof legacyVolume === 'string' && !newDaily[t.toString()]) {
                newDaily[t.toString()] = new Volume(type, dexId, t, {
                    [chain]: {
                        ...newProt
                    }
                })
            }
        }

        return newDaily
    }

    const storeBackup = async (backup: IBackupData) => {
        const entries = Object.values(backup)
        for (const volumeObj of entries) {
            if (typeof volumeObj === 'string') continue
            console.log("Storing", volumeObj)
            await storeVolume(volumeObj, Date.now() / 1000)
        }
    }

    try {
        // get dataset data
        const dataSet = path.resolve(process.cwd(), "./src/dexVolumes/cli/backfillUtilities/dataset/terraswap_terra1.csv");
        const data = fs.readFileSync(dataSet, 'utf8');
        const rawData = data.split('\n').slice(1).map(data => data.split(','));
        const dataSetData = rawData.reduce((acc, current) => ({ ...acc, [new Date(current[0]).getTime() / 1000]: current[1] }), {} as IBackupData)

        // get stored data
        const volumesDaily = await getVolume(dexId, VolumeType.dailyVolume, "ALL").catch(() => [] as Volume[])
        const volumesTotal = await getVolume(dexId, VolumeType.totalVolume, "ALL").catch(() => [] as Volume[])
        if (volumesDaily instanceof Volume || volumesTotal instanceof Volume) throw new Error("Wrong volume queried")
        const vDaily = volumesDaily.reduce((acc, current) => ({ ...acc, [current.timestamp]: current }), {} as IBackupData)
        const fromBackup = processData(dataSetData, vDaily, undefined, VolumeType.dailyVolume)
        const allBackupD = processData(vDaily, dataSetData, fromBackup, VolumeType.dailyVolume)
        const vTotal = volumesTotal.reduce((acc, current) => ({ ...acc, [current.timestamp]: current }), {} as IBackupData)
        const fromBackupT = processData(undefined, vTotal, undefined, VolumeType.totalVolume)
        const allBackupT = processData(vTotal, undefined, fromBackupT, VolumeType.totalVolume)
        await storeBackup(allBackupD)
        // await storeBackup(allBackupT)


    } catch (err) {
        console.error(err);
    }
})()