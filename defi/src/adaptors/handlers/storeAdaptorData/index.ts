import { wrapScheduledLambda } from "../../../utils/shared/wrap";
import { getTimestampAtStartOfDayUTC, getTimestampAtStartOfHour } from "../../../utils/date";
import { ChainBlocks, Adapter, AdapterType, BaseAdapter, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import canGetBlock from "../../utils/canGetBlock";
import runAdapter from "@defillama/dimension-adapters/adapters/utils/runAdapter";
import { getBlock } from "@defillama/dimension-adapters/helpers/getBlock";
import { Chain } from "@defillama/sdk/build/general";
import { AdaptorRecord, AdaptorRecordType, RawRecordMap, storeAdaptorRecord } from "../../db-utils/adaptor-record";
import { processFulfilledPromises, } from "./helpers";
import loadAdaptorsData from "../../data"
import { ProtocolAdaptor, } from "../../data/types";
import { PromisePool } from '@supercharge/promise-pool'
import { AdapterRecord2, } from "../../db-utils/AdapterRecord2";
import { storeAdapterRecord } from "../../db-utils/db2";
import { elastic } from '@defillama/sdk';
import { getUnixTimeNow } from "../../../api2/utils/time";
import { fork } from 'child_process'
import { humanizeNumber } from "@defillama/sdk/build/computeTVL/humanizeNumber";


// Runs a little bit past each hour, but calls function with timestamp on the hour to allow blocks to sync for high throughput chains. Does not work for api based with 24/hours

export interface IHandlerEvent {
  protocolModules: string[]
  timestamp?: number
  adaptorType: AdapterType
  chain?: Chain
  adaptorRecordTypes?: string[]
  protocolVersion?: string
}

const LAMBDA_TIMESTAMP = getTimestampAtStartOfHour(Math.trunc((Date.now()) / 1000))

export const handler = async (event: IHandlerEvent) => {
  return handler2({
    timestamp: event.timestamp,
    adapterType: event.adaptorType,
    protocolNames: event.protocolModules ? new Set(event.protocolModules) : undefined,
  })
};

export default wrapScheduledLambda(handler);

export type IStoreAdaptorDataHandlerEvent = {
  timestamp?: number
  adapterType: AdapterType
  protocolNames?: Set<string>
  maxConcurrency?: number
}

export const handler2 = async (event: IStoreAdaptorDataHandlerEvent) => {
  const defaultMaxConcurrency = 9
  let { timestamp, adapterType, protocolNames, maxConcurrency = defaultMaxConcurrency } = event
  console.info(`- Date: ${new Date(timestamp!*1e3).toDateString()} (timestamp ${timestamp})`)
  // Timestamp to query, defaults current timestamp - 2 minutes delay
  const isTimestampProvided = timestamp !== undefined
  const currentTimestamp = timestamp ?? LAMBDA_TIMESTAMP;
  // Get clean day
  const toTimestamp = getTimestampAtStartOfDayUTC(currentTimestamp)
  const fromTimestamp = getTimestampAtStartOfDayUTC(toTimestamp - 1)

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

  const { errors, results } = await PromisePool
    .withConcurrency(maxConcurrency)
    .for(protocols)
    .onTaskFinished((item: any, _: any) => {
      console.info(`[${adapterType}] - ${item.module} done!`)
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
  console.info(`Success: ${results.length} Errors: ${errors.length}`)
  if (errorObjects.length) console.table(errorObjects)
  // console.log(JSON.stringify(errorObjects, null, 2))

  console.info(`**************************`)

  async function runAndStoreProtocol(protocol: ProtocolAdaptor, index: number) {
    console.info(`[${adapterType}] - ${index + 1}/${protocols.length} - ${protocol.module}`)
    const startTime = getUnixTimeNow()
    const metadata = {
      application: "dimensions",
      type: 'protocol',
      name: protocol.module,
      subType: adapterType,
    }

    let success = true
    let errorObject: any
    // Get adapter info
    let { id, module, } = protocol;
    // console.info(`Adapter found ${id} ${module} ${versionKey}`)

    try {
      // Import adaptor
      const adaptor: Adapter = (await importModule(module)).default;
      // if an adaptor is expensive and no timestamp is provided, we try to avoid running every hour, but only from 21:55 to 01:55
      if (adaptor.isExpensiveAdapter && !isTimestampProvided) {
        const date = new Date(currentTimestamp * 1000)
        const hours = date.getUTCHours()
        if (hours > 2) {
          console.info(`[${adapterType}] - ${index + 1}/${protocols.length} - ${protocol.module} - skipping because it's an expensive adapter and it's not the right time`)
          return
        }
      }
      const adapterVersion = adaptor.version
      const isVersion2 = adapterVersion === 2
      const v1Timestamp = (timestamp !== undefined ? toTimestamp : fromTimestamp)
      const endTimestamp = (isVersion2 && !timestamp) ? LAMBDA_TIMESTAMP : toTimestamp // if version 2 and no timestamp, use current time as input for running the adapter
      const recordTimestamp = isVersion2 ? toTimestamp : v1Timestamp // if version 2, store the record at with timestamp end of range, else store at start of range
      // Get list of adapters to run
      const adaptersToRun: [string, BaseAdapter][] = []
      if ("adapter" in adaptor) {
        adaptersToRun.push([module, adaptor.adapter])
      } else if ("breakdown" in adaptor) {
        const dexBreakDownAdapter = adaptor.breakdown
        const breakdownAdapters = Object.entries(dexBreakDownAdapter)
        for (const [version, adapter] of breakdownAdapters) {
          adaptersToRun.push([version, adapter]) // the version is the key for the record (like uni v2) not the version of the adapter
        }
      } else
        throw new Error("Invalid adapter")

      const promises: any = []
      const rawRecords: RawRecordMap = {}
      const adaptorRecords: {
        [key: string]: AdaptorRecord
      } = {}
      for (const [version, adapter] of adaptersToRun) { // the version is the key for the record (like uni v2) not the version of the adapter
        const runAtCurrTime = Object.values(adapter).some(a => a.runAtCurrTime)
        if (runAtCurrTime && Math.abs(LAMBDA_TIMESTAMP - toTimestamp) > 60 * 60 * 3)
          throw new Error('This Adapter can be run only around current time') // allow run current time if within 3 hours
        const chainBlocks = {} // WARNING: reset chain blocks for each adapter, sharing this between v1 & v2 adapters that have different end timestamps have nasty side effects
        const runAdapterRes = await runAdapter(adapter, endTimestamp, chainBlocks, module, version, { adapterVersion })
        // const runAdapterRes = await runAdapterInSubprocess({ adapter, endTimestamp, chainBlocks, module, version, adapterVersion })

        processFulfilledPromises(runAdapterRes, rawRecords, version, KEYS_TO_STORE)
      }
      const storedData: any = {}
      const adaptorRecordTypeByValue: any  = Object.fromEntries(Object.entries(AdaptorRecordType).map(([key, value]) => [value, key]))
      for (const [recordType, record] of Object.entries(rawRecords)) {
        // console.info("STORING -> ", module, adapterType, recordType as AdaptorRecordType, id, recordTimestamp, record, adaptor.protocolType, protocol.defillamaId, protocol.versionKey)
        storedData[adaptorRecordTypeByValue[recordType]] = record
        adaptorRecords[recordType] = new AdaptorRecord(recordType as AdaptorRecordType, id, recordTimestamp, record, adaptor.protocolType)
        const promise = storeAdaptorRecord(adaptorRecords[recordType], LAMBDA_TIMESTAMP)
        promises.push(promise)
      }
      const adapterRecord = AdapterRecord2.formAdaptarRecord2({ adaptorRecords, protocolType: adaptor.protocolType, adapterType, protocol, configIdMap })
      if (adapterRecord)
        await storeAdapterRecord(adapterRecord)
      await Promise.all(promises)
      if (process.env.runLocal === 'true')
        printData(storedData, recordTimestamp, protocol.module)
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

type chainObjet = {
  [chain: string]: {
    [key: string]: any
  }
}

function printData(data: any, timestamp?: number, protocolName?: string ) {
  const chains: chainObjet = {};
  console.info(`\nrecord timestamp: ${timestamp}`)

  // Collect data from all chains and keys
  for (const [mainKey, chainData] of Object.entries(data)) {
    for (const [chain, values] of Object.entries(chainData as any)) {
      if (!chains[chain]) {
        chains[chain] = { protocols: {}, versions: {} };
      }
      for (const [subKey, value] of Object.entries(values as any)) {
        if (subKey === protocolName) {
          chains[chain].protocols[mainKey] = value;
        } else {
          if (!chains[chain].versions[subKey]) {
            chains[chain].versions[subKey] = {};
          }
          chains[chain].versions[subKey][mainKey] = value;
        }
      }
    }
  }

  // Print data, prioritizing protocol matches and handling versions otherwise
  for (const [chain, values] of Object.entries(chains)) {
    if (Object.keys(values.protocols).length > 0) {
      console.info('')
      console.log(`chain: ${chain}`);
      for (const [key, value] of Object.entries(values.protocols)) {
        console.log(`${key}: ${humanizeNumber(Number(value))}`);
      }
    } else {
      for (const [version, versionData] of Object.entries(values.versions)) {
        console.info('')
        console.log(`chain: ${chain}`);
        console.log(`version: ${version}`);
        for (const [key, value] of Object.entries(versionData as any)) {
          console.log(`${key}: ${humanizeNumber(Number(value))}`);
        }
      }
    }
  }
  console.info('\n')
}

/* const runAdapterInSubprocess = ({ adapter, endTimestamp, chainBlocks, module, version, adapterVersion }: any) => {
  return new Promise((resolve, reject) => {

    const child = fork(require.resolve('ts-node/dist/bin'), ['--transpile-only', __dirname + '../../../../dimension-adapters/adapters/utils/runAdapterSubProcess.ts'], { stdio: 'inherit' });

    console.log('sending message', { adapter, endTimestamp, chainBlocks, module, version, adapterVersion })
    child.send({ adapter, endTimestamp, chainBlocks, module, version, adapterVersion })
    child.on('message', (message) => {
      console.log('received message', message)
    });

    child.on('error', (error) => {
      console.error('error', error)
    });

    child.on('exit', (code, signal) => {
      console.log('exit', code, signal)
    });
  })
}; */
