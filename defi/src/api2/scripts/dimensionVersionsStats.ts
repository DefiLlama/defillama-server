
import { AdapterType } from "@defillama/dimension-adapters/adapters/types"
import loadAdaptorsData from "../../adaptors/data"
import { ADAPTER_TYPES } from "../../adaptors/handlers/triggerStoreAdaptorData"

async function run() {
  const table: any = []
  ADAPTER_TYPES.forEach(async (adapterType) => {
    const { protocolMap } = loadAdaptorsData(adapterType)
    const version1s: any = []
    const version2s: any = []
    const version1sWithRunAtCurrentTime: any = []
    const version2sWithRunAtCurrentTime: any = []
    for (const [_id, protocol] of Object.entries(protocolMap) as any) {
      const id = protocol.module
      const version = protocol._stat_adapterVersion
      const runAtCurrentTime = protocol._stat_runAtCurrTime

      if (version === 1) {
        version1s.push(id)
        if (runAtCurrentTime) version1sWithRunAtCurrentTime.push(id)
      } else if (version === 2) {
        version2s.push(id)
        if (runAtCurrentTime) version2sWithRunAtCurrentTime.push(id)
      }
    }
    const data = {
      adapterType,
      version1Count: version1s.length,
      version2Count: version2s.length,
      version1WithRunAtCurrentTimeCount: version1sWithRunAtCurrentTime.length,
      version2WithRunAtCurrentTimeCount: version2sWithRunAtCurrentTime.length,
      // version1s,
      // version2s,
      // version1sWithRunAtCurrentTime,
      // version2sWithRunAtCurrentTime
    }
    // console.log(data)
    table.push(data)
  })
  console.table(table)
}

run()