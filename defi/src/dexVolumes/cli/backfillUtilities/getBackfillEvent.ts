import { IHandlerEvent as ITriggerStoreVolumeEventHandler } from "../../../triggerStoreVolume"
import fs, { writeFileSync } from "fs"
import path from "path"
import volumeAdapters from '../../dexAdapters'
import { importVolumeAdapter } from "../../../utils/imports/importDexAdapters"
import { DexAdapter } from "@defillama/adapters/dexVolumes/dexVolume.type"

const DAY_IN_MILISECONDS = 1000 * 60 * 60 * 24

export default async () => {
    // comment dexs that you dont want to backfill
    const DEXS_LIST: string[] = [
        // '1inch',
        'balancer',
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
        // 'serum', 
        // 'soulswap', 
        // 'spiritswap', 
        // 'spookyswap', 
        // 'sushiswap', 
        // 'terraswap', 
        // 'traderjoe', 
        // 'uniswap'
    ]

    // Remember, it's new Date(year, monthIndex, day)
    let startTimestamp = new Date(2020, 0, 1).getTime()
    // Looking for start time from adapter
    const dex = volumeAdapters.find(dex => dex.volumeAdapter === DEXS_LIST[0])
    if (dex) {
        const dexAdapter: DexAdapter = (await importVolumeAdapter(dex)).default
        if ("volume" in dexAdapter) {
            const st = Object.values(dexAdapter.volume).reduce((acc, { start }) => start < acc ? start : acc, 0)
            if (st > 0) startTimestamp = st * 1000
        } else {
            const st = Object.values(dexAdapter.breakdown).reduce((acc, dexAdapter) => {
                const bst = Object.values(dexAdapter.volume).reduce((acc, { start }) => start < acc ? start : acc, 0)
                return bst < acc ? bst : acc
            }, 0)
            if (st > 0) startTimestamp = st * 1000
        }
    }
    const startDate = new Date(startTimestamp)
    console.info("Starting timestamp", startTimestamp, "->", startDate)
    const endDate = new Date()
    const dates: Date[] = []
    for (let dayInMilis = startDate.getTime(); dayInMilis <= endDate.getTime(); dayInMilis += DAY_IN_MILISECONDS) {
        const date = new Date(dayInMilis)
        dates.push(date)
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