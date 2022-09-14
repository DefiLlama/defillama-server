import { IHandlerEvent as ITriggerStoreVolumeEventHandler } from "../../../triggerStoreVolume"
import fs, { writeFileSync } from "fs"
import path from "path"
import volumeAdapters from '../../dexAdapters'
import { importVolumeAdapter } from "../../../utils/imports/importDexAdapters"
import { VolumeAdapter } from "@defillama/adapters/volumes/dexVolume.type"
import { getVolume, VolumeType } from "../../data/volume"
import getDataPoints from "../../utils/getDataPoints"

const DAY_IN_MILISECONDS = 1000 * 60 * 60 * 24

export default async (onlyMissing: boolean = false) => {
    // comment dexs that you dont want to backfill
    const DEXS_LIST: string[] = [
        // 'mooniswap', 
        // 'balancer', 
        // 'bancor', 
        // 'champagneswap', 
        // 'curve', 
        // 'dodo', 
        // 'katana', 
        // 'klayswap', 
        // 'osmosis', 
        // 'pancakeswap', 
        // 'quickswap', 
        // 'raydium', 
        // 'saros', 
        // 'serum', 
        // 'soulswap', 
        // 'spiritswap', 
        // 'spookyswap', 
        // 'sushiswap', 
        // 'terraswap', 
        // 'traderjoe', 
        // 'uniswap', 
        // 'gmx', 
        // 'velodrome', 
        // 'woofi', 
        // 'hashflow', 
        // 'biswap',
        // 'zipswap', 
        // 'wardenswap', 
        // 'apeswap', 
        // 'kyberswap', 
        // 'orca',
        // 'pangolin', 
        // 'ref-finance', 
        // 'saber', 
        // 'solidly'       
        // 'yoshi-exchange'
    ]

    let startTimestamp = 0
    // Looking for start time from adapter, if not found will default to the above
    const dex = volumeAdapters.find(dex => dex.volumeAdapter === DEXS_LIST[0])
    const nowSTimestamp = Math.trunc((Date.now()) / 1000)
    if (dex) {
        const dexAdapter: VolumeAdapter = (await importVolumeAdapter(dex)).default
        if ("volume" in dexAdapter) {
            const st = await Object.values(dexAdapter.volume)
                .reduce(async (accP, { start, runAtCurrTime }) => {
                    const acc = await accP
                    const currstart = runAtCurrTime ? nowSTimestamp + 2 : (await start().catch(() => nowSTimestamp))
                    return (typeof currstart === 'number' && currstart < acc) ? currstart : acc
                }, Promise.resolve(nowSTimestamp + 1))
            startTimestamp = st
        } else {
            const st = await Object.values(dexAdapter.breakdown).reduce(async (accP, dexAdapter) => {
                const acc = await accP
                const bst = await Object.values(dexAdapter).reduce(async (accP, { start, runAtCurrTime }) => {
                    const acc = await accP
                    const currstart = runAtCurrTime ? nowSTimestamp + 2 : (await start().catch(() => nowSTimestamp))
                    return (typeof currstart === 'number' && currstart < acc) ? currstart : acc
                }, Promise.resolve(nowSTimestamp + 1))

                return bst < acc ? bst : acc
            }, Promise.resolve(nowSTimestamp + 1))
            startTimestamp = st
        }
        if (startTimestamp > 0) startTimestamp *= 1000
        else startTimestamp = new Date(Date.UTC(2018, 0, 1)).getTime()
    } else {
        throw new Error(`No dex found with name ${DEXS_LIST[0]}`)
    }
    // For specific ranges (remember months starts with 0)
    // const startDate = new Date(Date.UTC(2022, 7, 5))
    // For new adapters
    const startDate = new Date(startTimestamp)
    console.info("Starting timestamp", startTimestamp, "->", startDate)
    const endDate = new Date(nowSTimestamp * 1000)
    const dates: Date[] = []
    if (onlyMissing) {
        const vols = await getVolume(dex.id, VolumeType.dailyVolume, "ALL")
        if (!(vols instanceof Array)) throw new Error("Incorrect volumes found")
        const volTimestamps = vols.map(vol => [vol.timestamp, Object.values(vol.data).filter(data => Object.keys(data).includes("error")).length > 0]).filter(b => b[1])
        const allTimestamps = getDataPoints(startTimestamp)
        for (const timest of allTimestamps) {
            if (volTimestamps.find(vt => timest === vt[0]))
                dates.push(new Date(timest * 1000))
        }
    } else {
        let dayInMilis = startDate.getTime()
        while (dayInMilis <= endDate.getTime()) {
            dates.push(new Date(dayInMilis))
            dayInMilis += DAY_IN_MILISECONDS
        }
    }
    const event: ITriggerStoreVolumeEventHandler = {
        backfill: dates.map(date => ({
            dexNames: DEXS_LIST,
            timestamp: date.getTime() / 1000
        }))
    }

    const eventFileLocation = path.resolve(__dirname, "output", `backfill_event.json`);
    ensureDirectoryExistence(eventFileLocation)
    writeFileSync(eventFileLocation, JSON.stringify(event, null, 2))
    console.log(`Event stored ${eventFileLocation}`)
}

function ensureDirectoryExistence(filePath: string) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}