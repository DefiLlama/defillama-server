import { AdapterType, IJSON } from "@defillama/dimension-adapters/adapters/types"
import { ADAPTER_TYPES } from "../../adaptors/handlers/triggerStoreAdaptorData"
import { getAdapterRecordTypes } from "../../adaptors/handlers/getOverviewProcess"
import { getOverviewProcess2, getProtocolDataHandler2 } from "../routes/dimensions"
import { storeRouteData } from "../cache/file-cache"
import { normalizeDimensionChainsMap } from "../../adaptors/utils/getAllChainsFromAdaptors"
import { sluggifyString } from "../../utils/sluggify"


const sluggifiedNormalizedChains: IJSON<string> = Object.keys(normalizeDimensionChainsMap).reduce((agg, chain) => ({ ...agg, [chain]: sluggifyString(chain.toLowerCase()) }), {})


export default async function generateDimensionsResponseFiles(cache: any) {
  for (const adapterType of ADAPTER_TYPES) {
    if (adapterType === AdapterType.PROTOCOLS) continue
    const cacheData = cache[adapterType]
    const { protocolSummaries, parentProtocolSummaries, } = cacheData

    const timeKey = `dimensions-gen-files ${adapterType}`
    console.time(timeKey)

    let recordTypes = getAdapterRecordTypes(adapterType)
    // recordTypes = [recordTypes[0]]

    for (const recordType of recordTypes) {
      const timeKey = `dimensions-gen-files ${adapterType} ${recordType}`
      console.time(timeKey)

      // fetch and store overview of each record type
      const allData = await getOverviewProcess2({ recordType, cacheData, })
      await storeRouteData(`dimensions/${adapterType}/${recordType}-all`, allData)
      allData.totalDataChart = []
      allData.totalDataChartBreakdown = []
      await storeRouteData(`dimensions/${adapterType}/${recordType}-lite`, allData)

      // store per chain overview
      const chains = allData.allChains ?? []

      for (const chainLabel of chains) {
        let chain = chainLabel.toLowerCase()
        chain = sluggifiedNormalizedChains[chain] ?? chain
        const data = await getOverviewProcess2({ recordType, cacheData, chain })
        await storeRouteData(`dimensions/${adapterType}/${recordType}-chain/${chain}-all`, data)
        data.totalDataChart = []
        data.totalDataChartBreakdown = []
        await storeRouteData(`dimensions/${adapterType}/${recordType}-chain/${chain}-lite`, data)
      }

      // store protocol summary for each record type
      // const allProtocols: any = Object.entries(protocols)
      const allProtocols: any = { ...protocolSummaries, ...parentProtocolSummaries }
      for (let [id, protocol] of Object.entries(allProtocols) as any) {
        if (!protocol.info) {
          console.log('no info for protocol', id)
          continue
        }

        id = protocol.info.defillamaId ?? protocol.info.id ?? id

        const data = await getProtocolDataHandler2({ recordType, protocolData: protocol })
        const protocolSlug = sluggifyString(data.name)
        const protocolSlugDN = data.displayName ? sluggifyString(data.displayName) : null
        const differentDisplayName = protocolSlugDN && protocolSlug !== protocolSlugDN
        await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${protocolSlug}-all`, data)
        if (differentDisplayName)
          await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${protocolSlugDN}-all`, data)
        data.totalDataChart = []
        data.totalDataChartBreakdown = []
        await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${protocolSlug}-lite`, data)
        if (differentDisplayName)
          await storeRouteData(`dimensions/${adapterType}/${recordType}-protocol/${protocolSlugDN}-lite`, data)
      }
      /* 
      for (let [id, protocol] of Object.entries(childProtocols) as any) {
        if (protocol.info?.isBreakdownAdapter) {
          console.log('skipping breakdown adapter', id)
          continue;
        }
        if (!protocol.info) {
          console.log('no info for protocol', id)
          continue
        }

        id = protocol.info.defillamaId ?? protocol.info.id ?? id

        const data = await getProtocolDataHandler2({ recordType, cacheData, protocolData: protocol, commonCacheData })
        await storeRouteData(`dimensions/${adapterType}/${recordType}-childProtocols/${id}-all`, data)
        data.totalDataChart = []
        data.totalDataChartBreakdown = []
        await storeRouteData(`dimensions/${adapterType}/${recordType}-childProtocols/${id}-lite`, data)
      }
      for (let [id, protocol] of Object.entries(parentProtocols) as any) {
        if (protocol.info?.isBreakdownAdapter) {
          console.log('skipping breakdown adapter', id)
          continue;
        }
        if (!protocol.info) {
          console.log('no info for protocol', id)
          continue
        }

        id = protocol.info.defillamaId ?? protocol.info.id ?? id

        const data = await getProtocolDataHandler2({ recordType, cacheData, protocolData: protocol, commonCacheData })
        await storeRouteData(`dimensions/${adapterType}/${recordType}-parentProtocols/${id}-all`, data)
        data.totalDataChart = []
        data.totalDataChartBreakdown = []
        await storeRouteData(`dimensions/${adapterType}/${recordType}-parentProtocols/${id}-lite`, data)
      }

*/
      // console.timeEnd(timeKey)
    }

    console.timeEnd(timeKey)
  }
}