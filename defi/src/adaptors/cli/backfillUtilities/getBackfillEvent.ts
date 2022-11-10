import { IHandlerEvent as ITriggerStoreVolumeEventHandler } from "../../handlers/triggerStoreAdaptorData"
import fs, { writeFileSync } from "fs"
import path from "path"
import loadAdaptorsData from "../../data"
import { IJSON } from "../../data/types"
import { Adapter } from "@defillama/adaptors/adapters/types";
import { getAdaptorRecord, AdaptorRecordType } from "../../db-utils/adaptor-record"
import getDataPoints from "../../utils/getDataPoints"
import { getUniqStartOfTodayTimestamp } from "../../../../adapters/helpers/getUniSubgraphVolume"
import { removeEventTimestampAttribute } from "../../handlers/getOverview"
import { AdapterType } from "@defillama/adaptors/adapters/types";
import { ONE_DAY_IN_SECONDS } from "../../handlers/getProtocol"

const DAY_IN_MILISECONDS = 1000 * 60 * 60 * 24

export default async (adapter: string, adaptorType: AdapterType, onlyMissing: boolean | number = false) => {
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
            type: adaptorType,
            backfill: [{
                dexNames: [adapterName],
                timestamp: onlyMissing + ONE_DAY_IN_SECONDS
            }]
        }

    let startTimestamp = 0
    // Looking for start time from adapter, if not found will default to the above
    const adaptorsData = loadAdaptorsData(adaptorType)
    const adapterData = adaptorsData.default.find(adapter => adapter.module === (adapterName))
    const nowSTimestamp = Math.trunc((Date.now()) / 1000)
    if (adapterData) {
        const dexAdapter: Adapter = adaptorsData.importModule(adapterData.module).default
        if ("adapter" in dexAdapter) {
            const st = await Object.values(dexAdapter.adapter)
                .reduce(async (accP, { start, runAtCurrTime }) => {
                    const acc = await accP
                    const currstart = runAtCurrTime ? nowSTimestamp + 2 : +(await start().catch(() => nowSTimestamp))
                    return (currstart && currstart < acc && currstart !== 0) ? currstart : acc
                }, Promise.resolve(nowSTimestamp + 1))
            startTimestamp = st
        } else {
            const st = await Object.values(dexAdapter.breakdown).reduce(async (accP, dexAdapter) => {
                const acc = await accP
                const bst = await Object.values(dexAdapter).reduce(async (accP, { start, runAtCurrTime }) => {
                    const acc = await accP
                    const currstart = runAtCurrTime ? nowSTimestamp + 2 : (await start().catch(() => nowSTimestamp))
                    return (typeof currstart === 'number' && currstart < acc && currstart !== 0) ? currstart : acc
                }, Promise.resolve(nowSTimestamp + 1))

                return bst < acc ? bst : acc
            }, Promise.resolve(nowSTimestamp + 1))
            startTimestamp = st
        }
        if (startTimestamp > 0) startTimestamp *= 1000
        else startTimestamp = new Date(Date.UTC(2018, 0, 1)).getTime()
    } else {
        throw new Error(`No adapter found with name ${adapterName} of type ${adaptorType}`)
    }
    // For specific ranges (remember months starts with 0)
    // const startDate = new Date(Date.UTC(2022, 8, 1))
    // For new adapters
    // TODO: IMPROVE performance!
    const startDate = new Date(getUniqStartOfTodayTimestamp(new Date(startTimestamp)) * 1000)
    console.info("Starting timestamp", startTimestamp, "->", startDate)
    const endDate = new Date(nowSTimestamp * 1000)
    const dates: Date[] = []
    if (onlyMissing && typeof onlyMissing === "boolean") {
        let volTimestamps = {} as IJSON<boolean>
        for (const type of Object.keys(adaptorsData.KEYS_TO_STORE).slice(0, 1)) {
            let vols = (await getAdaptorRecord(adapterData.id, type as AdaptorRecordType, adapterData.protocolType, "ALL"))
            if (!(vols instanceof Array)) throw new Error("Incorrect volumes found")
            vols = vols.map(removeEventTimestampAttribute)
            volTimestamps = vols
                .map<[number, boolean]>(vol => [
                    vol.timestamp,
                    Object.values(vol.data)
                        .filter(data => Object.keys(data).includes("error") || vol.data === undefined).length > 0
                ])
                // .concat(getDataPoints((vols[vols.length - 1].timestamp * 1000) + DAY_IN_MILISECONDS).map(time => [time, true]))
                .reduce((acc, [timestamp, hasAnErrorOrEmpty]) => {
                    acc[String(timestamp)] = acc[String(timestamp)] === true ? acc[String(timestamp)] : hasAnErrorOrEmpty
                    return acc
                }, volTimestamps)
        }
        //console.log("volTimestamps", volTimestamps)
        const allTimestamps = getDataPoints(startDate.getTime())
        for (const timest of allTimestamps) {
            if (volTimestamps[timest] === true || volTimestamps[timest] === undefined) {
                dates.push(new Date(timest * 1000 + DAY_IN_MILISECONDS))
            }
        }
    } else {
        let dayInMilis = startDate.getTime()
        if (dayInMilis < getUniqStartOfTodayTimestamp(endDate) * 1000)
            while (dayInMilis <= endDate.getTime()) {
                dates.push(new Date(dayInMilis))
                dayInMilis += DAY_IN_MILISECONDS
            }
    }

    if (!event)
        event = {
            type: adaptorType,
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