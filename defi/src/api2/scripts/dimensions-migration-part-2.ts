// in this script we pull data from local file cache & write to pg & new ddb table
// The migration script is split because, reading from ddb is expensive, we want to do this as little as possible, idea is we run this once
// and then we can run the rest of the migration scripts multiple times (and test changes) without having to read from ddb

import { AdaptorRecord, AdaptorRecordType, } from "../../adaptors/db-utils/adaptor-record";
import { readFromPGCache, } from "../cache/file-cache";
import { AdapterType, } from "@defillama/dimension-adapters/adapters/types";
import loadAdaptorsData from "../../adaptors/data"
import { ProtocolAdaptor } from "../../adaptors/data/types";
import { ADAPTER_TYPES } from "../../adaptors/handlers/triggerStoreAdaptorData";
import { getTimestampString } from "../utils";
import { AdapterRecord2 } from "../../adaptors/db-utils/AdapterRecord2";
import { storeAdapterRecordBulk } from "../../adaptors/db-utils/db2";
import PromisePool from "@supercharge/promise-pool";
import { sliceIntoChunks } from "@defillama/sdk/build/util";

export function getFileCacheKey(adaptorRecordType: AdapterType) {
  return `tmp/dimensions-data-migration-v1/${adaptorRecordType}`
}

export function getKey(adaptor: ProtocolAdaptor, recordType: AdaptorRecordType) {
  return `${adaptor.id2}-${recordType}`
}

async function run() {
  // Go over all types
  for (const adapterType of ADAPTER_TYPES) {

    if (adapterType !== AdapterType.OPTIONS) continue;

    const consoleKey = `-----------------adapterType: ${adapterType}`
    console.time(consoleKey)


    const data: any = await readFromPGCache(getFileCacheKey(adapterType))
    const { protocolAdaptors, config } = loadAdaptorsData(adapterType)

    const configIdMap: any = {}
    Object.entries(config).forEach(([key, i]) => {
      const id = config[key].isChain ? 'chain#' + i.id : i.id
      configIdMap[id] = i
    })

    let progressCount = 0
    const total = protocolAdaptors.length

    const { errors } = await PromisePool.withConcurrency(25)
      .for(protocolAdaptors)
      .process(async (protocol) => {
        // if (protocol.id2 !== '2116') return;
        const protocolData = data[protocol.id2]
        if (!protocolData) {
          console.error(`No records found for ${protocol.id2} ${protocol.name}`)
          return;
        }

        console.log(`${protocol.id2} ${protocol.name} ${Object.keys(protocolData).length} items`)
        let count = 0
        const dataDayMap: any = {}
        Object.keys(protocolData).forEach((recordType) => {
          protocolData[recordType].forEach((record: any) => {
            count++
            // if (count > 12) return;
            if (!record.timestamp) throw new Error(`No timestamp found for ${protocol.id2} ${protocol.name} ${recordType}`)
            const dateKey = getTimestampString(record.timestamp)
            if (!dataDayMap[dateKey]) dataDayMap[dateKey] = {}
            dataDayMap[dateKey][recordType] = AdaptorRecord.fromJSON(record)
          })
        })
        const protocolKey = `Writing ${adapterType} ${protocol.id2} ${protocol.name} ${Object.keys(dataDayMap).length} days`
        console.time(protocolKey)
        const items: AdapterRecord2[] = Object.values(dataDayMap).map((adaptorRecords: any) => AdapterRecord2.formAdaptarRecord2({ adaptorRecords, adapterType, protocol, configIdMap, protocolType: protocol.protocolType, skipZeroValue: false })).filter(i => i) as any

        // if (protocol.id2 === '3951')
        //   items.map((item: any) => console.log(item.data.aggregated.dv))

        await storeAdapterRecordBulk(items)
        // const chunks = sliceIntoChunks(items, 5)
        // for (const chunk of chunks) {
        //   try {
        //     await storeAdapterRecordBulk(chunk)
        //   } catch (error) {
        //     console.error(`Error writing to ddb`, error)
        //     console.log(JSON.stringify(chunk, null, 2)  )
        //   }
        // }

        console.timeEnd(protocolKey)
        console.log(`Progress: ${adapterType} ${Number(++progressCount * 100 / total).toFixed(2)} % `)
      })

    if (errors.length > 0) console.error(errors)

    console.timeEnd(consoleKey)
  }
}

run().catch(console.error).then(() => process.exit(0))
