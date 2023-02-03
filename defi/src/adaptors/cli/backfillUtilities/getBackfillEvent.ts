import { IHandlerEvent as ITriggerStoreVolumeEventHandler } from "../../handlers/triggerStoreAdaptorData"
import fs, { writeFileSync } from "fs"
import path from "path"
import loadAdaptorsData from "../../data"
import { IJSON } from "../../data/types"
import { Adapter } from "@defillama/dimension-adapters/adapters/types";
import { getAdaptorRecord, AdaptorRecordType, AdaptorRecord } from "../../db-utils/adaptor-record"
import getDataPoints from "../../utils/getDataPoints"
import { getUniqStartOfTodayTimestamp } from "@defillama/dimension-adapters/helpers/getUniSubgraphVolume"
import { removeEventTimestampAttribute } from "../../handlers/getOverviewProcess"
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { ONE_DAY_IN_SECONDS } from "../../handlers/getProtocol"
import { ICliArgs } from "./backfillFunction"
import { Chain } from "@defillama/sdk/build/general"
import { getStartTimestamp } from "@defillama/dimension-adapters/helpers/getStartTimestamp"

const DAY_IN_MILISECONDS = 1000 * 60 * 60 * 24

export default async (adapter: string[], adaptorType: AdapterType, cliArguments: ICliArgs) => {
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
    let event: ITriggerStoreVolumeEventHandler | undefined

    const adapterName = adapter ?? DEXS_LIST[0]
    const adaptorsData = loadAdaptorsData(adaptorType)
    if (adapterName[0] === 'all') {
        const timestamp = cliArguments.timestamp ?? getUniqStartOfTodayTimestamp(new Date()) - ONE_DAY_IN_SECONDS
        const type = Object.keys(adaptorsData.KEYS_TO_STORE).slice(0, 1)[0]
        const adapters2Backfill: string[] = []
        console.info("Checking missing type:", type, "at", timestamp)
        for (const adapter of adaptorsData.default) {
            const volume = await getAdaptorRecord(adapter.id, type as AdaptorRecordType, adapter.protocolType, "TIMESTAMP", timestamp).catch(_e => { })
            if (!volume) {
                adapters2Backfill.push(adapter.module)
            }
            if (volume instanceof AdaptorRecord) {
                if (volume.getCleanAdaptorRecord() === null)
                    adapters2Backfill.push(adapter.module)
            }
        }
        event = {
            type: adaptorType,
            backfill: [{
                dexNames: adapters2Backfill,
                timestamp: timestamp + ONE_DAY_IN_SECONDS,
                chain: cliArguments.chain as Chain,
                adaptorRecordTypes: cliArguments.recordTypes,
                protocolVersion: cliArguments.version,
            }]
        }
    }
    else if (cliArguments.timestamp) {
        event = {
            type: adaptorType,
            backfill: [{
                dexNames: adapterName,
                timestamp: cliArguments.timestamp + ONE_DAY_IN_SECONDS,
                chain: cliArguments.chain as Chain,
                adaptorRecordTypes: cliArguments.recordTypes,
                protocolVersion: cliArguments.version,
            }]
        }
    }
    else {
        let startTimestamp = 0
        // Looking for start time from adapter, if not found will default to the above
        const nowSTimestamp = Math.trunc((Date.now()) / 1000)
        const adapterData = adaptorsData.default.find(adapter => adapter.module === (adapterName[0]))
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
        if (cliArguments.onlyMissing) {
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
        event = {
            type: adaptorType,
            backfill: dates.map(date => ({
                dexNames: adapterName,
                timestamp: date.getTime() / 1000,
                chain: cliArguments.chain as Chain,
                adaptorRecordTypes: cliArguments.recordTypes,
                protocolVersion: cliArguments.version,
            }))
        }
    }

    const eventFileLocation = path.resolve(__dirname, "output", `backfill_event.json`);
    ensureDirectoryExistence(eventFileLocation)
    writeFileSync(eventFileLocation, JSON.stringify(event, null, 2))
    console.log(`Event stored ${eventFileLocation}`)
    return event
}

export function ensureDirectoryExistence(filePath: string) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}