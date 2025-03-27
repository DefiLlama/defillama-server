import loadAdaptorsData from "../../../data"
import { chainConfigMap, gasData } from '@defillama/dimension-adapters/helpers/blockscoutFees'

import { PromisePool } from '@supercharge/promise-pool';
import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import { getChainDisplayName } from "../../../../utils/normalizeChain";
import { httpGet } from "@defillama/dimension-adapters/utils/fetchURL";
import { handler2, IStoreAdaptorDataHandlerEvent } from "..";

process.env.BLOCKSCOUT_BULK_MODE = "true"


async function refillAllProtocols() {

  const chainsWithAllData = Object.entries(chainConfigMap)
    .filter(([_, data]: any) => data.allStatsApi)
  // .map(([chain]) => getChainDisplayName(chain, true))
  const chainDataMap: any = {}
  chainsWithAllData.forEach(([chain, data]: any) => {
    data.chainKey = chain
    chainDataMap[getChainDisplayName(chain, true)] = data
  })
  const chainNamesWithAllDataSet = new Set(Object.keys(chainDataMap))
  const { protocolAdaptors } = loadAdaptorsData(AdapterType.FEES)
  const cAdapters = protocolAdaptors.filter(i => i.protocolType === ProtocolType.CHAIN && chainNamesWithAllDataSet.has(i.name))
  cAdapters.forEach((i) => chainDataMap[i.name].adapter = i)

  const items: any = Object.entries(chainDataMap)

  await PromisePool.for(items)
    .withConcurrency(7)
    .process(async ([chain, data]: any) => {
      const chainKey = data.chainKey
      // if (chain !== 'Celo') return;
      try {

        console.log('Running for chain: ', chain)


        const { chart } = await httpGet(`${(data as any).allStatsApi}/api/v1/lines/txnsFee?resolution=DAY`)
        gasData[chainKey] = {}
        for (const { date, value } of chart) {
          gasData[chainKey][date] = +value
        }

        console.log('# records ', chart.length, chainKey)

        for (const { date } of chart) {
          const eventObj: IStoreAdaptorDataHandlerEvent = {
            timestamp: Math.floor(+new Date(date) / 1e3),
            adapterType: AdapterType.FEES,
            isDryRun: false,
            protocolNames: new Set([chain]),
            isRunFromRefillScript: true,
          }
          await handler2(eventObj)
        }


      } catch (e) {
        console.error(e)
      }

    })

}

refillAllProtocols()
  .then(() => {
    console.log('All done')
  }).catch((e) => {
    console.error('Error', e)
  }).finally(() => {
    process.exit(0)
  })