import { IHandlerEvent as ITriggerStoreVolumeEventHandler } from "../../../triggerStoreVolume"
import fs, { writeFileSync } from "fs"
import path from "path"
import volumeAdapters from '../../dexAdapters'
import { importVolumeAdapter } from "../../../utils/imports/importDexAdapters"
import { VolumeAdapter } from "@defillama/adapters/volumes/dexVolume.type"
import { getVolume, VolumeType } from "../../data/volume"
import getDataPoints from "../../utils/getDataPoints"
import { getUniqStartOfTodayTimestamp } from "@defillama/adapters/volumes/helper/getUniSubgraphVolume"
import { removeEventTimestampAttribute } from "../../handlers/getDexs"

const DAY_IN_MILISECONDS = 1000 * 60 * 60 * 24

export default async (adapter?: string, onlyMissing: boolean | number = false) => {
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
        // 'yoshi-exchange',
        // 'platypus'
    ]

    const adapterName = adapter ?? DEXS_LIST[0]

    let event: ITriggerStoreVolumeEventHandler | undefined
    if (typeof onlyMissing === 'number')
        event = {
            backfill: [{
                dexNames: [adapterName],
                timestamp: onlyMissing
            }]
        }

    let startTimestamp = 0
    // Looking for start time from adapter, if not found will default to the above
    const dex = volumeAdapters.find(dex => dex.volumeAdapter === (adapterName))
    const nowSTimestamp = Math.trunc((Date.now()) / 1000)
    if (dex) {
        const dexAdapter: VolumeAdapter = (await importVolumeAdapter(dex)).default
        if ("volume" in dexAdapter) {
            const st = await Object.values(dexAdapter.volume)
                .reduce(async (accP, { start, runAtCurrTime }) => {
                    const acc = await accP
                    const currstart = runAtCurrTime ? nowSTimestamp + 2 : +(await start().catch(() => nowSTimestamp))
                    return (currstart && currstart < acc) ? currstart : acc
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
        throw new Error(`No dex found with name ${adapterName}`)
    }
    // For specific ranges (remember months starts with 0)
    // const startDate = new Date(Date.UTC(2022, 8, 1))
    // For new adapters
    const startDate = new Date(getUniqStartOfTodayTimestamp(new Date(startTimestamp)) * 1000)
    console.info("Starting timestamp", startTimestamp, "->", startDate)
    const endDate = new Date(nowSTimestamp * 1000)
    const dates: Date[] = []
    if (onlyMissing) {
        let vols = (await getVolume(dex.id, VolumeType.dailyVolume, "ALL"))
        if (!(vols instanceof Array)) throw new Error("Incorrect volumes found")
        vols = vols.map(removeEventTimestampAttribute)
        let volTimestamps = (vols
            .map<[number, boolean]>(vol => [
                vol.timestamp,
                Object.values(vol.data)
                    .filter(data => {
                        return Object.keys(data).includes("error")
                            || vol.data === undefined
                    }).length > 0
            ]).filter(b => b[1]))
            .concat(getDataPoints(vols[vols.length - 1].timestamp * 1000).map(time => [time, true]))
            .reduce((acc, [timestamp, hasAnErrorOrEmpty]) => {
                acc[String(timestamp)] = hasAnErrorOrEmpty
                return acc
            }, {} as { [key: string]: boolean })
        //console.log("volTimestamps", volTimestamps)
        const allTimestamps = getDataPoints(startTimestamp)
        for (const timest of allTimestamps) {
            if (volTimestamps[timest] === true) {
                dates.push(new Date(timest * 1000 + DAY_IN_MILISECONDS))
            }
        }
    } else {
        let dayInMilis = startDate.getTime()
        if (dayInMilis < getUniqStartOfTodayTimestamp(endDate) * 1000)
            while (dayInMilis <= endDate.getTime()) {
                console.log("dates", dayInMilis)
                dates.push(new Date(dayInMilis))
                dayInMilis += DAY_IN_MILISECONDS
            }
    }

    if (!event)
        event = {
            backfill: dates.map(date => ({
                dexNames: [adapterName],
                timestamp: date.getTime() / 1000
            }))
        }

    const eventFileLocation = path.resolve(__dirname, "output", `backfill_event.json`);
    ensureDirectoryExistence(eventFileLocation)
    writeFileSync(eventFileLocation, JSON.stringify(event, null, 2))
    console.log(`Event stored ${eventFileLocation}`)
    return event
}

function ensureDirectoryExistence(filePath: string) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}