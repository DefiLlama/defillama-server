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
import { sumAllVolumes } from "../../utils/volumeCalcs"
import { getStringArrUnique } from "../../utils/getAllChainsFromAdaptors"
import { formatTimestampAsDate } from "../../../utils/date"

const DAY_IN_MILISECONDS = 1000 * 60 * 60 * 24

type TKeysToCheck = {
    [l: AdapterType | string]: string;
}
const KEYS_TO_CHECK: TKeysToCheck = {
    [AdapterType.FEES]: 'df',
    [AdapterType.DEXS]: 'dv',
    [AdapterType.INCENTIVES]: 'ti',
    [AdapterType.AGGREGATORS]: 'dv',
    [AdapterType.DERIVATIVES]: 'dv',
    [AdapterType.OPTIONS]: 'dv',
    [AdapterType.PROTOCOLS]: 'dv',
    [AdapterType.ROYALTIES]: 'dv',
}

export default async (adapter: string[], adaptorType: AdapterType, cliArguments: ICliArgs) => {
    // declare event used to trigger backfill
    let event: ITriggerStoreVolumeEventHandler | undefined

    // load all adapters data
    const adapterName = adapter
    const adaptorsData = await loadAdaptorsData(adaptorType)

    // build event with all adapters with missing data for specified timestamp
    if (adapterName[0] === 'all') {
        // get timestamp to work with
        const timestamp = cliArguments.timestamp ?? getUniqStartOfTodayTimestamp(new Date()) - ONE_DAY_IN_SECONDS
        // based on the type, check for default dataType
        const type = KEYS_TO_CHECK[adaptorType]
        console.info(`Checking missing ${type} at ${formatTimestampAsDate(timestamp)}`)
        const adapters2Backfill: string[] = []
        // Go through all adapters checking if data for today is available
        for (const adapter of adaptorsData.default) {
            // Query timestamp data from dynamo
            const volume = await getAdaptorRecord(adapter.id, type as AdaptorRecordType, adapter.protocolType, "TIMESTAMP", timestamp).catch(_e => { })
            // if data is missing add 2 backfill
            if (!volume) {
                adapters2Backfill.push(adapter.module)
            }
            else if (volume instanceof AdaptorRecord) {
                const cleanRecord = volume.getCleanAdaptorRecord()
                if (
                    // if clean data (filtering errors, posible NaN values, event data) is null
                    cleanRecord === null
                    // or sum of timestamp's dimension is 0
                    || sumAllVolumes(cleanRecord.data) === 0
                    // or is missing a specific chain data
                    || Object.keys(cleanRecord.data).length < adapter.chains.length
                )
                    // then 2 backfill
                    adapters2Backfill.push(adapter.module)
            }
        }
        // build event
        event = {
            type: adaptorType,
            backfill: [{
                dexNames: getStringArrUnique(adapters2Backfill), //arrUniqueBcCollectionsAreUnderSameMoule
                timestamp: timestamp + ONE_DAY_IN_SECONDS,
                chain: cliArguments.chain as Chain,
                adaptorRecordTypes: cliArguments.recordTypes,
                protocolVersion: cliArguments.version,
            }]
        }
    }
    // build event for specified adapters at specified timestamp
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
    // build event for historical backfill
    else {
        // TODO: IMPROVE code
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
            for (const type of [KEYS_TO_CHECK[adaptorType]]) {
                console.log("Checking missing days for data type -> ", type)
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

    try {
        const eventFileLocation = path.resolve(__dirname, "output", `backfill_event.json`);
        ensureDirectoryExistence(eventFileLocation)
        writeFileSync(eventFileLocation, JSON.stringify(event, null, 2))
        console.log(`Event stored ${eventFileLocation}`)
    } catch (error) {
        console.info("Unable to store backfill event", error)
    }
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
