import { AdaptorRecord, getAdaptorRecord2, } from "../../adaptors/db-utils/adaptor-record";
import { getAdapterRecordTypes, } from "../../adaptors/handlers/getOverviewProcess";
import { AdapterType, ProtocolType, } from "@defillama/dimension-adapters/adapters/types";
import loadAdaptorsData from "../../adaptors/data"
import { ProtocolAdaptor } from "../../adaptors/data/types";
import { ADAPTER_TYPES } from "../../adaptors/handlers/triggerStoreAdaptorData";
import { getTimestampString } from "../utils";
import { AdapterRecord2 } from "../../adaptors/db-utils/AdapterRecord2";
import { storeAdapterRecordBulk } from "../../adaptors/db-utils/db2";
import { sliceIntoChunks } from "@defillama/sdk/build/util";

async function run() {
  // Go over all types
  const promises: any = ADAPTER_TYPES.map(async (adapterType) => {
    if (adapterType === AdapterType.FEES) return;

    const data: any = {}
    const recordTypes = getAdapterRecordTypes(adapterType)
    console.log('recordTypes', recordTypes)
    const { protocolAdaptors, config } = loadAdaptorsData(adapterType)

    const configIdMap: any = {}
    Object.entries(config).forEach(([key, i]) => {
      const id = config[key].isChain ? 'chain#' + i.id : i.id
      configIdMap[id] = i
    })

    let adaptersList: ProtocolAdaptor[] = protocolAdaptors
    console.log('adaptersList', adaptersList.length)
    adaptersList = adaptersList.filter(i => i.protocolType === ProtocolType.CHAIN)
    console.log('chains', adaptersList.length, adaptersList.map(i => i.name).join(', '))
    // adaptersList = adaptersList.filter(i => i.id2 === 'chain#5805')

    let progressCount = 0
    const total = adaptersList.length

    for (const protocol of adaptersList) {
      console.log('coping data for chainAdapter', protocol.id2, protocol.name)
      const dataDayMap: any = {}

      // fetch records from ddb
      for (const recordType of recordTypes) {
        try {
          const records = (await getAdaptorRecord2({ adapter: protocol, type: recordType })) as AdaptorRecord[]
          console.log('fetched', protocol.name, protocol.id2, recordType, records.length, 'items')
          records.forEach((record: any) => {
            if (!record.timestamp) {
              console.error(`No timestamp found for ${protocol.id2} ${protocol.name} ${recordType}`)
              return;
            }
            const dateKey = getTimestampString(record.timestamp)
            if (!dataDayMap[dateKey]) dataDayMap[dateKey] = {}
            dataDayMap[dateKey][recordType] = AdaptorRecord.fromJSON(record)
          })
        } catch (error) {
          console.log(`Couldn't write adaptorRecordType: ${adapterType} recordType: ${recordType}`, error?.message)
        }
      }


      // write records to postgres
      const protocolKey = `Writing ${adapterType} ${protocol.id2} ${protocol.name} ${Object.keys(dataDayMap).length} days`
      console.time(protocolKey)
      const items: AdapterRecord2[] = Object.values(dataDayMap).map((adaptorRecords: any) => AdapterRecord2.formAdaptarRecord2({ adaptorRecords, adapterType, protocol, configIdMap, protocolType: protocol.protocolType, skipZeroValue: true })).filter(i => i) as any

      const chunks = sliceIntoChunks(items, 500)
      for (const chunk of chunks) {
        try {
          await storeAdapterRecordBulk(chunk)
        } catch (error) {
          console.error(`Error writing to ddb`, error)
          console.log(JSON.stringify(chunk, null, 2)  )
        }
      }

      console.timeEnd(protocolKey)
      console.log(`Progress: ${adapterType} ${Number(++progressCount * 100 / total).toFixed(2)} % `)

    }
  })
  await Promise.all(promises)
}

run().catch(console.error).then(() => process.exit(0))
