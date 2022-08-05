import { IHandlerEvent as ITriggerStoreVolumeEventHandler } from "../../../triggerStoreVolume"
import fs, { writeFileSync } from "fs"
import path from "path"

const DAY_IN_MILISECONDS = 1000 * 60 * 60 * 24

export default () => {
    // comment dexs that you dont want to backfill
    const DEXS_LIST: string[] = [
        // '1inch', 
        // 'balancer', 
        // 'bancor', 
        // 'champagneswap', 
        // 'curve', 
        // 'dodo', 
        // 'katana', 
        // 'klayswap', 
        // 'osmosis', 
        'pancakeswap',
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
    const startDate = new Date(2022, 0, 1)
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