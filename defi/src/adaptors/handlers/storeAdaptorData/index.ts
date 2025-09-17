import { Adapter, AdapterType, BaseAdapter, SimpleAdapter, } from "@defillama/dimension-adapters/adapters/types";
import runAdapter from "@defillama/dimension-adapters/adapters/utils/runAdapter";
import { getBlock } from "@defillama/dimension-adapters/helpers/getBlock";
import { elastic } from '@defillama/sdk';
import { humanizeNumber, } from "@defillama/sdk/build/computeTVL/humanizeNumber";
import { Chain, providers } from "@defillama/sdk/build/general";
import { PromisePool } from '@supercharge/promise-pool';
import { getUnixTimeNow } from "../../../api2/utils/time";
import { getTimestampAtStartOfDayUTC, getTimestampAtStartOfHour } from "../../../utils/date";
import loadAdaptorsData from "../../data";
import { IJSON, ProtocolAdaptor, } from "../../data/types";
import { AdapterRecord2, } from "../../db-utils/AdapterRecord2";
import { storeAdapterRecord } from "../../db-utils/db2";
import { sendDiscordAlert } from "../../utils/notify";
import dynamodb from "../../../utils/shared/dynamodb";
import * as sdk from '@defillama/sdk'


const blockChains = Object.keys(providers)

const canGetBlock = (chain: Chain) => blockChains.includes(chain)
// Runs a little bit past each hour, but calls function with timestamp on the hour to allow blocks to sync for high throughput chains. Does not work for api based with 24/hours
const timestampAtStartofHour = getTimestampAtStartOfHour(Math.trunc((Date.now()) / 1000))
const timestampAnHourAgo = timestampAtStartofHour - 2 * 60 * 60

export type IStoreAdaptorDataHandlerEvent = {
  timestamp?: number
  adapterType: AdapterType
  protocolNames?: Set<string>
  maxConcurrency?: number
  isDryRun?: boolean
  isRunFromRefillScript?: boolean
  yesterdayIdSet?: Set<string>
  todayIdSet?: Set<string>
  runType?: 'store-all' | 'default'
  throwError?: boolean
  checkBeforeInsert?: boolean
}

const ONE_DAY_IN_SECONDS = 24 * 60 * 60

export const handler2 = async (event: IStoreAdaptorDataHandlerEvent) => {
  const defaultMaxConcurrency = 13
  let { timestamp = timestampAnHourAgo, adapterType, protocolNames, maxConcurrency = defaultMaxConcurrency, isDryRun = false, isRunFromRefillScript = false,
    runType = 'default', yesterdayIdSet = new Set(), todayIdSet = new Set(),
    throwError = false, checkBeforeInsert = false,

  } = event
  if (!isRunFromRefillScript)
    console.log(`- Date: ${new Date(timestamp! * 1e3).toDateString()} (timestamp ${timestamp})`)
  // Get clean day
  let toTimestamp: number
  let fromTimestamp: number

  // I didnt want to touch existing implementation that affects other scripts, but it looks like it is off by a day if we store it at the end of the time range (which is next day 00:00 UTC)
  if (isRunFromRefillScript) {
    fromTimestamp = getTimestampAtStartOfDayUTC(timestamp!)
    toTimestamp = fromTimestamp + ONE_DAY_IN_SECONDS - 1

    if (toTimestamp * 1000 > Date.now()) {
      console.log(`[${adapterType}] - cant refill data for today, it's not over yet`)
      return;
    }

  } else if (runType === 'store-all') {
    fromTimestamp = timestampAnHourAgo - ONE_DAY_IN_SECONDS
    toTimestamp = fromTimestamp + ONE_DAY_IN_SECONDS - 1
  }

  if (!toTimestamp!) throw new Error('toTimestamp is not set')

  const _debugTimeStart = Date.now()

  // Import data list to be used
  const dataModule = loadAdaptorsData(adapterType)
  // Import some utils
  const { importModule, KEYS_TO_STORE, config, protocolAdaptors } = dataModule
  const configIdMap: any = {}
  Object.entries(config).forEach(([key, i]) => {
    const id = config[key].isChain ? 'chain#' + i.id : i.id
    configIdMap[id] = i
  })

  // Get list of adaptors to run
  let protocols = protocolAdaptors

  // Filter adaptors
  protocols = protocols.filter(p => !protocolNames || protocolNames.has(p.displayName) || protocolNames.has(p.module))
  // randomize the order of execution
  protocols = protocols.sort(() => Math.random() - 0.5)

  // Get closest block to clean day. Only for EVM compatible ones.
  const allChains = protocols.reduce((acc, { chains }) => {
    acc.push(...chains as Chain[])
    return acc
  }, [] as Chain[]).filter(canGetBlock)
  await Promise.all(
    allChains.map(async (chain) => {
      try {
        await getBlock(toTimestamp, chain, {}).catch((e: any) => console.error(`${e.message}; ${toTimestamp}, ${chain}`))
      } catch (e) { console.log('error fetching block, chain:', chain, (e as any)?.message) }
    })
  );

  // const timeTable: any = []
  const { errors, results } = await PromisePool
    .withConcurrency(maxConcurrency)
    .for(protocols)
    .onTaskFinished((item: any, _: any) => {
      if (!isRunFromRefillScript)
        console.log(`[${adapterType}] - ${item.module} done!`)
    })
    .process(runAndStoreProtocol)

  const shortenString = (str: string, length: number = 250) => {
    if (typeof str !== 'string') str = JSON.stringify(str)
    if (str === undefined) return `undefined`
    return str.length > length ? str.slice(0, length) + '...' : str
  }

  const errorObjects = errors.map(({ raw, item, message }: any) => {
    return {
      adapter: `${item.name} - ${item.versionKey ?? ''}`,
      message: shortenString(message),
      chain: raw.chain,
      // stack: raw.stack?.split('\n').slice(1, 2).join('\n')
    }
  })


  const debugTimeEnd = Date.now()
  const notificationType = 'dimensionLogs'
  const timeTakenSeconds = Math.floor((debugTimeEnd - _debugTimeStart) / 1000)

  if (!isRunFromRefillScript) {
    console.log(`Success: ${results.length} Errors: ${errors.length} Time taken: ${timeTakenSeconds}s`)
    await sendDiscordAlert(`[${adapterType}] Success: ${results.length} Errors: ${errors.length} Time taken: ${timeTakenSeconds}`, notificationType)
  }


  if (errorObjects.length) {
    const logs = errorObjects.map(({ adapter, message, chain }, i) => `${i} ${adapter} - ${message} - ${chain}`)
    const headers = ['Adapter', 'Error Message', 'Chain'].join(' - ')
    logs.unshift(headers)

    if (!isRunFromRefillScript)
      await sendDiscordAlert(logs.join('\n'), notificationType, true)
    console.table(errorObjects)
  }

  if (throwError && errorObjects.length)
    throw new Error('Errors found')

  if (isRunFromRefillScript)
    return results
  // console.log(JSON.stringify(errorObjects, null, 2))
  /* console.log(` ${adapterType} Success: ${results.length} Errors: ${errors.length} Time taken: ${timeTakenSeconds}s`)
  console.table(timeTable) */

  console.log(`**************************`)

  async function runAndStoreProtocol(protocol: ProtocolAdaptor, index: number) {
    // if (protocol.module !== 'mux-protocol') return;
    if (!isRunFromRefillScript)
      console.log(`[${adapterType}] - ${index + 1}/${protocols.length} - ${protocol.module}`)


    const startTime = getUnixTimeNow()
    const metadata = {
      application: "dimensions",
      type: 'protocol',
      name: protocol.module,
      subType: adapterType,
    }

    let success = true
    let refillYesterdayPromise = undefined
    let errorObject: any
    // Get adapter info
    let { id, id2, module, } = protocol;
    // console.log(`Adapter found ${id} ${module} ${versionKey}`)

    try {
      // Import adaptor
      const adaptor: SimpleAdapter = await importModule(module);
      // if an adaptor is expensive and no timestamp is provided, we try to avoid running every hour, but only from 21:55 to 01:55
      const adapterVersion = adaptor.version
      const isAdapterVersionV1 = adapterVersion === 1
      const { isExpensiveAdapter, runAtCurrTime } = adaptor

      if (adaptor.deadFrom) {
        const isDeadNow = !isRunFromRefillScript || (startTime * 1e3 > +new Date(adaptor.deadFrom).getTime())
        if (isDeadNow) {
          console.log(`Skipping ${adapterType}- ${module} - deadFrom: ${adaptor.deadFrom}`, isRunFromRefillScript, startTime * 1e3 , +new Date(adaptor.deadFrom).getTime())
          return;
        }
      }

      let endTimestamp = toTimestamp
      let recordTimestamp = toTimestamp
      if (isRunFromRefillScript) recordTimestamp = fromTimestamp // when we are storing data, irrespective of version, store at start timestamp while running from refill script? 
      // I didnt want to touch existing implementation that affects other scripts, but it looks like it is off by a day if we store it at the end of the time range (which is next day 00:00 UTC) - this led to record being stored on the next day of the 24 hour range?


      if ("adapter" in adaptor) {
      } else if ("breakdown" in adaptor) {
        throw new Error("Invalid adapter - breakdown are no longer supported")
      } else
        throw new Error("Invalid adapter")


      if (isRunFromRefillScript && runAtCurrTime) {
        if (Date.now() - fromTimestamp * 1000 > 1000 * 60 * 60 * 24) {
          throw new Error(`${adapterType} - ${module} - runAtCurrTime is set, but the refill script is running for more than 24 hours`)
        }
      }

      if (runType === 'store-all') {

        const date = new Date()
        const hours = date.getUTCHours()
        // if it is an expensive adapter run every 4 hours or after 20:00 UTC
        const runNow = !isExpensiveAdapter || (hours % 4 === 0 || hours > 20)
        const haveTodayData = todayIdSet.has(id2)
        const haveYesterdayData = yesterdayIdSet.has(id2)
        const yesterdayEndTimestamp = getTimestampAtStartOfDayUTC(Math.floor(Date.now() / 1000)) - 1


        if (runAtCurrTime || !isAdapterVersionV1) {
          recordTimestamp = timestampAtStartofHour
          endTimestamp = timestampAtStartofHour

          // check if data for yesterday is missing for v2 adapter and attemp to refill it if refilling is supported
          if (!runAtCurrTime && !haveYesterdayData) {
            console.log(`Refill ${adapterType} - ${protocol.module} - missing yesterday data, attempting to refill`)
            try {
              refillYesterdayPromise = handler2({
                timestamp: yesterdayEndTimestamp,
                adapterType,
                protocolNames: new Set([protocol.displayName]),
                isRunFromRefillScript: true,
              })
            } catch (e) {
              console.error(`Error refilling ${adapterType} - ${protocol.module} - ${(e as any)?.message}`)
            }
          }

          if (haveTodayData && !runNow) {
            console.log(`Skipping ${adapterType} - ${protocol.module} - already have today data for adapter running at current time`)
            return;
          }
        } else { // it is a version 1 adapter - we pull yesterday's data
          if (haveYesterdayData) {
            console.log(`Skipping ${adapterType} - ${protocol.module} already have yesterday data`)
            return;
          }

          endTimestamp = yesterdayEndTimestamp
          recordTimestamp = getTimestampAtStartOfDayUTC(endTimestamp)
        }

        /*  timeTable.push({
           module: protocol.module,
           timeS: getTimestampString(recordTimestamp),
           version: adapterVersion,
           runAtCurrTime,
           endTimestamp: new Date(endTimestamp * 1e3).toISOString(),
           recordTimestamp: new Date(recordTimestamp * 1e3).toISOString(),
         })
         return; */
      }


      let noDataReturned = true  // flag to track if any data was returned from the adapter, idea is this would be empty if we run for a timestamp before the adapter's start date

      const { adaptorRecordV2JSON, breakdownByToken, } = await runAdapter({ module: adaptor, endTimestamp, name: module, withMetadata: true, cacheResults: runType === 'store-all' },) as any
      convertRecordTypeToKeys(adaptorRecordV2JSON, KEYS_TO_STORE)  // remove unmapped record types and convert keys to short names


      // sort out record timestamp
      const timestampFromResponse = adaptorRecordV2JSON.timestamp

      if (timestampFromResponse) {
        if (runType === 'store-all') {
          // check if the timestamp is valid by checking if it is in the current year
          const year = new Date(timestampFromResponse * 1e3).getUTCFullYear()
          if (year !== new Date().getUTCFullYear()) {
            console.error(`Record timestamp ${adapterType} - ${module} - invalid timestamp`, new Date(timestampFromResponse * 1e3).toISOString(), 'current time: ', new Date().toISOString())
            adaptorRecordV2JSON.timestamp = recordTimestamp
          }
        }
      } else {
        adaptorRecordV2JSON.timestamp = recordTimestamp
      }



      if (noDataReturned) noDataReturned = Object.keys(adaptorRecordV2JSON.aggregated).length === 0
      if (noDataReturned && isRunFromRefillScript) {
        console.log(`[${new Date(endTimestamp * 1000).toISOString().slice(0, 10)}] No data returned for ${adapterType} - ${module} - skipping`)
        return;
      }

      const responseObject: any = {
        recordV2: undefined,
        storeDDBFunctions: [],
        storeRecordV2Function: undefined,
        adapterType: adapterType,
        protocolName: protocol.displayName,
      }

      const adapterRecord = AdapterRecord2.formAdaptarRecord2({ jsonData: adaptorRecordV2JSON, protocolType: adaptor.protocolType, adapterType, protocol, })

      async function storeTokenBreakdownData() {
        if (!adapterRecord || !breakdownByToken) return;
        const ddbItem = { ...adapterRecord.getDDBItem() } as any
        ddbItem.data = breakdownByToken
        ddbItem.source = 'dimension-adapter'
        ddbItem.subType = 'token-breakdown'
        ddbItem.PK = `dimTokenBreakdown#${ddbItem.PK}`
        await dynamodb.putEventData(ddbItem)
      }

      if (adapterRecord) {
        if (!isDryRun) {

          await storeAdapterRecord(adapterRecord)
          await storeTokenBreakdownData()

        } else if (checkBeforeInsert) {

          responseObject.storeRecordV2Function = () => storeAdapterRecord(adapterRecord)
          responseObject.storeDDBFunctions.push(storeTokenBreakdownData)
          responseObject.recordV2 = adapterRecord
          responseObject.id = `${adapterRecord.adapterType}#${adapterRecord.id}#${adapterRecord.timeS}`
          responseObject.timeS = adapterRecord.timeS
        }
      }
      if (process.env.runLocal === 'true' || isRunFromRefillScript)
        printData(adaptorRecordV2JSON, recordTimestamp, protocol.module)

      if (refillYesterdayPromise)
        await refillYesterdayPromise

      return responseObject
    }
    catch (error) {
      try { (error as any).module = module } catch (e) { }
      success = false
      errorObject = error
    }

    const endTime = getUnixTimeNow()
    await elastic.addRuntimeLog({ runtime: endTime - startTime, success, metadata, })

    if (errorObject) {
      await elastic.addErrorLog({ error: errorObject, metadata })
      throw errorObject
    }
  }
};


// to covert 'dailyVolume' -> 'dv', 'dailyRevenue' -> 'dr', etc and removes unmapped record types from the object
function convertRecordTypeToKeys(recordV2Json: any, ATTRIBUTE_KEYS: IJSON<string>) {
  const reverseMap = Object.fromEntries(Object.entries(ATTRIBUTE_KEYS).map(([key, value]) => [value, key]));
  const result: IJSON<any> = {};

  for (const obj of Object.values(recordV2Json))
    convertObject(obj);

  return result;

  function convertObject(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    for (const [recordType, value] of Object.entries(obj)) {
      delete obj[recordType]
      const key = reverseMap[recordType]
      if (key) obj[key] = value
    }
  }
}

type chainObjet = {
  [chain: string]: {
    [key: string]: any
  }
}

function printData(data: any, timestamp?: number, protocolName?: string) {
  const chainInfo: chainObjet = {};
  console.log(`\n protocol: ${protocolName} record timestamp: ${timestamp} (${new Date((timestamp ?? 0) * 1e3).toISOString()})`)

  // Collect data from all chains and keys
  Object.entries(data.aggregated).forEach(([recordType, { chains }]: [string, any]) => {
    Object.entries(chains).forEach(([chain, value]: [string, any]) => {
      if (!chainInfo[chain]) chainInfo[chain] = { chain };
      chainInfo[chain][recordType] = humanizeNumber(value);
    });
  })

  console.log(sdk.util.tableToString(Object.values(chainInfo)))
  console.log('\n')
}
