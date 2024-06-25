import '../../api2/utils/failOnError'

import { ADAPTER_TYPES } from "./triggerStoreAdaptorData";
import { sendDiscordAlert } from "../utils/notify";
import loadAdaptorsData from "../data"
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import * as sdk from '@defillama/sdk'

setTimeout(() => {
  console.error("Timeout reached, exiting from dimensions: notify & backfill ...")
  process.exit(1)
}, 1000 * 60 * 2) // should not run more than 2 minutes

// query to fetch all successful protocol data in the last 24 hours, grouped by protocol name and subType along with the latest timestamp
const esQuery = {
  query: {
    "bool": {
      "must": [
        {
          "term": {
            "success": true
          }
        },
        {
          "range": {
            "timestamp": {
              "gte": "now-24h"
            }
          }
        }
      ]
    }
  },
  "aggs": {
    "protocols": {
      "terms": {
        "field": "metadata.name.keyword",
        "size": 10000
      },
      "aggs": {
        "adapterType": {
          "terms": {
            "field": "metadata.subType.keyword",
            "size": 10000
          },
          "aggs": {
            "lastTimestamp": {
              "max": {
                "field": "timestamp"
              }
            }
          }
        }
      }
    }
  },
  "size": 0 // The size parameter in the root of the query is set to 0 because we're only interested in the aggregation results, not the actual documents.
}

export const handler = async () => {
  try {
    console.info("Starting notifyAdapterStatus2 ...")
    const esClient = sdk.elastic.getClient()
    const data = await esClient!.search({
      index: 'debug-runtime-logs-*',
      body: esQuery
    }) as any
    for (const adaptorType of ADAPTER_TYPES) {
      await notifyAdapterStatus(adaptorType, data.aggregations.protocols.buckets)
    }
  } catch (e) {
    console.error("Error in notifyAdapterStatus", e)
  }
};
console.info("Hello from notifyAdapterStatus");
(async () => {
  try {
    await handler();
  } catch (e) {
    console.error("Error in notifyAdapterStatus", e)
  }
  process.exit(0)
})();

const DISCORD_USER_0xgnek_ID = '<@!736594617918554182>'

async function notifyAdapterStatus(adaptorType: AdapterType, esData: any) {
  if (adaptorType === AdapterType.PROTOCOLS) {
    console.log("skipping protocols")
    return;
  }
  const protocolLastUpdateMap = new Map<string, number>()
  for (const protocol of esData) {
    for (const adapterType of protocol.adapterType.buckets) {
      if (adapterType.key === adaptorType) {
        protocolLastUpdateMap.set(protocol.key, adapterType.lastTimestamp.value)
      }
    }
  }

  const protocolsList = Object.entries((await loadAdaptorsData(adaptorType as AdapterType)).config).filter(([_key, config]) => config.enabled).map(m => m[0])
  let notUpdated = [] as string[]
  let notUpdated6Hours = [] as string[]
  const sixHoursAgo = Date.now() - 1000 * 60 * 60 * 6
  for (const prot of protocolsList)
    if (!protocolLastUpdateMap.has(prot))
      notUpdated.push(prot)
    else if (protocolLastUpdateMap.get(prot)! < sixHoursAgo)
      notUpdated6Hours.push(prot)

  if (notUpdated6Hours.length > 0) {
    await sendDiscordAlert(`[${adaptorType} - notify2] The following protocols haven't been updated in last 6 hours: ${notUpdated6Hours.join(", ")}`, adaptorType)
    // if (notUpdated6Hours.length > 40)
    // await sendDiscordAlert(`[${adaptorType} - notify2] ${notUpdated6Hours.length} protocols haven't updated in the last 6 hours ${DISCORD_USER_0xgnek_ID}`, adaptorType, false)
  }


  if (notUpdated.length > 0) {
    await sendDiscordAlert(`[${adaptorType} - notify2] The following protocols haven't been updated in last 24 hours: ${notUpdated.join(", ")}`, adaptorType)
    if (notUpdated.length > 20)
    await sendDiscordAlert(`[${adaptorType} - notify2] ${notUpdated.length} have not updated in the last 24 hours ${DISCORD_USER_0xgnek_ID}`, adaptorType, false)
  }
  else
    await sendDiscordAlert(`[${adaptorType}] Looks like all good`, adaptorType)
}
