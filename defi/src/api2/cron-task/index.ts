import { cache, initCache, getCoinMarkets, getLastHourlyRecord, getLastHourlyTokensUsd, } from "../cache";
import { readRouteData, storeRouteData, storeTvlCacheAllFile, } from "../cache/file-cache";
import { getLatestProtocolItems, initializeTVLCacheDB } from "../db";
import { shuffleArray } from "../../utils/shared/shuffleArray";
import PromisePool from "@supercharge/promise-pool";
import { IChain, IProtocol } from "../../types";
import { craftProtocolV2 } from "../utils/craftProtocolV2";
import { craftChainsResponse } from "../routes/getChains";
import { craftProtocolsResponseInternal as craftAllProtocolResponse } from "../../getProtocols";
import { craftParentProtocolV2 } from "../utils/craftParentProtocolV2";
import { getRaisesInternal } from "../routes/getRaises";
import { getHacksInternal } from "../routes/getHacks";
import { getTokenRightsInternal } from "../routes/getTokenRights";
import { dailyTvl, hourlyTvl, hourlyUsdTokensTvl } from "../../utils/getLastRecord";
import { getHistoricalTvlForAllProtocolsOptionalOptions, storeGetCharts } from "../../storeGetCharts";
import { getOraclesInternal } from "../routes/getOracles";
import { getForksInternal } from "../routes/getForks";
import { getCategoriesInternal } from "../routes/getCategories";
import { storeLangs } from "../routes/storeLangs";
import { storeGetProtocols } from "../../storeGetProtocols";
import { getYieldsConfig } from "../../getYieldsConfig";
import { getOutdated } from "../../stats/getOutdated";
import * as sdk from '@defillama/sdk'
import { RUN_TYPE, runWithRuntimeLogging } from "../utils";
import { genFormattedChains } from "./genFormattedChains";
import { fetchRWAStats } from "../../rwa";
import { sendMessage } from "../../utils/discord";
import { chainKeyToLabelMap } from "../../utils/normalizeChain";
import { getActiveUsers } from "../routes/getActiveUsers";

const protocolDataMap: { [key: string]: any } = {}

let getYesterdayTvl: Function, getLastWeekTvl: Function, getLastMonthTvl: Function
let getYesterdayTokensUsd: Function, getLastWeekTokensUsd: Function, getLastMonthTokensUsd: Function

async function run() {

  await initializeTVLCacheDB()
  await initCache({ cacheType: RUN_TYPE.CRON })

  console.time('init protocol data map')
  await initializeProtocolDataMap()
  console.timeEnd('init protocol data map')

  await addProtocolAppMetadataToCache()

  await storeTvlCacheAllFile(cache)


  const processProtocolsOptions: getHistoricalTvlForAllProtocolsOptionalOptions = {
    protocolList: cache.metadata.protocols,
    getLastTvl: (protocol: any) => protocolDataMap[protocol.id]?.lastHourlyRecord,
    getAllTvlData: (protocol: any) => protocolDataMap[protocol.id]?.tvlData,
  }

  // await writeProtocolTvlData()  // to be served from rest api instead
  await writeBitcoinAddressesFile()
  await writeProtocols()
  await writeConfig()
  await writeOracles()
  await writeForks()
  await writeCategories()

  console.time('write /langs')
  await storeLangs(processProtocolsOptions)
  console.timeEnd('write /langs')

  console.time('write /charts')
  await storeGetCharts(processProtocolsOptions)
  console.timeEnd('write /charts')
  await writeProtocolsChart()
  await storeRouteData('config/yields', getYieldsConfig())
  await storeRouteData('outdated', await getOutdated(getLastHourlyRecord))

  await storeActiveUsers()
  await storeRWAStats()


  // await storeRouteData('twitter/overview', await getTwitterOverviewFileV2())

  // await writeRaises() // moved to different cron task
  // await writeHacks()  // moved to different cron task

  // Commenting this out as it takes long time to run, will be served from rest api instead
  // await writeProtocolRoute()

  async function initializeProtocolDataMap() {

    console.time('getLatestProtocolItems filterLast24Hours')
    const latestProtocolItems = await getLatestProtocolItems(hourlyTvl, { filterLast24Hours: true })
    const latestProtocolItemsMap: any = {}
    latestProtocolItems.forEach((data: any) => latestProtocolItemsMap[data.id] = data.data)
    // console.timeEnd('getLatestProtocolItems filterLast24Hours')


    console.time('getLatestProtocolItems filterADayAgo')
    const latestProtocolItemsDayAgo = await getLatestProtocolItems(hourlyTvl, { filterADayAgo: true })
    const latestProtocolItemsDayAgoMap: any = {}
    latestProtocolItemsDayAgo.forEach((data: any) => latestProtocolItemsDayAgoMap[data.id] = data.data)
    // console.timeEnd('getLatestProtocolItems filterADayAgo')

    console.time('getLatestProtocolItems filterAWeekAgo')
    const latestProtocolItemsWeekAgo = await getLatestProtocolItems(dailyTvl, { filterAWeekAgo: true })
    const latestProtocolItemsWeekAgoMap: any = {}
    latestProtocolItemsWeekAgo.forEach((data: any) => latestProtocolItemsWeekAgoMap[data.id] = data.data)
    // console.timeEnd('getLatestProtocolItems filterAWeekAgo')

    console.time('getLatestProtocolItems filterAMonthAgo')
    const latestProtocolItemsMonthAgo = await getLatestProtocolItems(dailyTvl, { filterAMonthAgo: true })
    const latestProtocolItemsMonthAgoMap: any = {}
    latestProtocolItemsMonthAgo.forEach((data: any) => latestProtocolItemsMonthAgoMap[data.id] = data.data)
    // console.timeEnd('getLatestProtocolItems filterAMonthAgo')

    console.time('getLatestProtocolTokensUSD filterADayAgo')
    const latestProtocolTokensUSD = await getLatestProtocolItems(hourlyUsdTokensTvl, { filterADayAgo: true, })
    const latestProtocolTokensUSDMap: any = {}
    latestProtocolTokensUSD.forEach((data: any) => latestProtocolTokensUSDMap[data.id] = data.data)
    // console.timeEnd('getLatestProtocolTokensUSD filterADayAgo')

    console.time('getLatestProtocolTokensUSD filterAWeekAgo')
    const latestProtocolTokensUSDWeekAgo = await getLatestProtocolItems(dailyTvl, { filterAWeekAgo: true })
    const latestProtocolTokensUSDWeekAgoMap: any = {}
    latestProtocolTokensUSDWeekAgo.forEach((data: any) => latestProtocolTokensUSDWeekAgoMap[data.id] = data.data)
    // console.timeEnd('getLatestProtocolTokensUSD filterAWeekAgo')

    console.time('getLatestProtocolTokensUSD filterAMonthAgo')
    const latestProtocolTokensUSDMonthAgo = await getLatestProtocolItems(dailyTvl, { filterAMonthAgo: true })
    const latestProtocolTokensUSDMonthAgoMap: any = {}
    latestProtocolTokensUSDMonthAgo.forEach((data: any) => latestProtocolTokensUSDMonthAgoMap[data.id] = data.data)
    // console.timeEnd('getLatestProtocolTokensUSD filterAMonthAgo')


    console.time('getAllProtocolItems')
    getYesterdayTvl = (protocol: any) => latestProtocolItemsDayAgoMap[protocol.id] ?? {}
    getLastWeekTvl = (protocol: any) => latestProtocolItemsWeekAgoMap[protocol.id] ?? {}
    getLastMonthTvl = (protocol: any) => latestProtocolItemsMonthAgoMap[protocol.id] ?? {}
    getYesterdayTokensUsd = (protocol: any) => latestProtocolTokensUSDMap[protocol.id] ?? {}
    getLastWeekTokensUsd = (protocol: any) => latestProtocolTokensUSDWeekAgoMap[protocol.id] ?? {}
    getLastMonthTokensUsd = (protocol: any) => latestProtocolTokensUSDMonthAgoMap[protocol.id] ?? {}

    cache.metadata.protocols
      .map((protocol: any) => {
        try {
          const dataObj: any = {}
          protocolDataMap[protocol.id] = dataObj
          const tvlData = cache.allTvlData[protocol.id]

          const hourlyItem = latestProtocolItemsMap[protocol.id]
          dataObj.tvlData = tvlData
          dataObj.lastHourlyRecord = hourlyItem
          dataObj.tvlADayAgo = latestProtocolItemsDayAgoMap[protocol.id]
          dataObj.tvlAWeekAgo = latestProtocolItemsWeekAgoMap[protocol.id]
          dataObj.tvlAMonthAgo = latestProtocolItemsMonthAgoMap[protocol.id]

        } catch (e) {
          console.error(e)
        }
      });
    console.timeEnd('getAllProtocolItems')
  }

  async function writeProtocolRoute() {
    console.time('write /protocol/:name')
    const withConcurrency = 25
    const options = { useNewChainNames: false, skipAggregatedTvl: false }

    let items = shuffleArray(Object.entries(cache.protocolSlugMap))

    await PromisePool.withConcurrency(withConcurrency).for(items)
      .process(async ([slugName, protocolData]: [string, IProtocol]) => {
        const key = `protocol/${slugName}`
        const data = await craftProtocolV2({ ...options, protocolData })
        await storeRouteData(key, data)
      })

    items = shuffleArray(Object.entries(cache.parentProtocolSlugMap))
    await PromisePool.withConcurrency(withConcurrency).for(items)
      .process(async ([slugName, parentProtocol]: [string, IProtocol]) => {
        const key = `protocol/${slugName}`
        const data = await craftParentProtocolV2({ ...options, parentProtocol: parentProtocol as any })
        await storeRouteData(key, data)
      })

    options.skipAggregatedTvl = true
    options.useNewChainNames = true
    items = shuffleArray(Object.entries(cache.protocolSlugMap))
    await PromisePool.withConcurrency(withConcurrency).for(items)
      .process(async ([slugName, protocolData]: [string, IProtocol]) => {
        const key = `updatedProtocol/${slugName}`
        const data = await craftProtocolV2({ ...options, protocolData })
        await storeRouteData(key, data)
      })

    items = shuffleArray(Object.entries(cache.parentProtocolSlugMap))
    await PromisePool.withConcurrency(withConcurrency).for(items)
      .process(async ([slugName, parentProtocol]: [string, IProtocol]) => {
        const key = `updatedProtocol/${slugName}`
        const data = await craftParentProtocolV2({ ...options, parentProtocol: parentProtocol as any })
        await storeRouteData(key, data)
      })


    // write treasury data
    items = shuffleArray(Object.entries(cache.treasurySlugMap))

    await PromisePool.withConcurrency(withConcurrency).for(items)
      .process(async ([slugName, protocolData]: [string, IProtocol]) => {
        const key = `treasury/${slugName}`
        const data = await craftProtocolV2({ ...options, protocolData })
        await storeRouteData(key, data)
      })



    // write entity data
    items = shuffleArray(Object.entries(cache.entitiesSlugMap))
    await PromisePool.withConcurrency(withConcurrency).for(items)
      .process(async ([slugName, protocolData]: [string, IProtocol]) => {
        const key = `entity/${slugName}`
        const data = await craftProtocolV2({ ...options, protocolData })
        await storeRouteData(key, data)
      })
    console.timeEnd('write /protocol/:name')
  }

  async function writeProtocolTvlData() {
    console.time('write /tvl/:name')
    const withConcurrency = 25
    let items = shuffleArray(Object.entries(cache.protocolSlugMap))

    await PromisePool
      .withConcurrency(withConcurrency)
      .for(items)
      .process(async ([slugName, protocolData]: [string, IProtocol]) => {
        const key = `tvl/${slugName}`
        const data = getLastHourlyRecord(protocolData)
        await storeRouteData(key, data?.tvl)
      })

    items = shuffleArray(Object.entries(cache.parentProtocolSlugMap))

    await PromisePool
      .withConcurrency(withConcurrency)
      .for(items)
      .process(async ([slugName, parentProtocol]: [string, IProtocol]) => {
        const key = `tvl/${slugName}`
        const childProtocols = cache.childProtocols[parentProtocol.id] ?? []
        if (childProtocols.length < 1 || childProtocols.map((p: any) => p.name).includes(parentProtocol.name)) {
          console.log('bad parent protocol', parentProtocol.name)
          return;
        }

        const tvl = childProtocols.map(getLastHourlyRecord).reduce((acc: number, cur: any) => acc + cur.tvl, 0);

        await storeRouteData(key, tvl)
      })
    console.timeEnd('write /tvl/:name')
  }

  async function writeProtocols() {
    console.time('write /protocols')

    let useNewChainNames = false
    let includeTokenBreakdowns = false
    let protocolList = cache.metadata.protocols
    let data = await getData()

    await storeRouteData('protocols', data)

    const excludeProtocolFields = [
      'description', 'forkedFromIds', 'logo', 'misrepresentedTokens', 'github',
      'audits', 'audit_links', 'hallmarks', 'oraclesBreakdown',
      'cmcId', 'gecko_id', 'methodology', 'dimensions',
      'module', 'pool2', 'staking',
      'tvl', 'chainTvls', 'change_1h', 'change_1d', 'change_7d', 'tokenBreakdowns', 'mcap',
      'listedAt',
    ]

    // /protocols file is heavy, we create a lite version without some fields
    const protocolsLite = data.map((p: any) => {
      const clone = { ...p }
      excludeProtocolFields.forEach(field => delete clone[field])
      return clone
    })

    const chainData: IChain[] = await getChainData(false)
    const chainDataV2: IChain[] = await getChainData(true)
    data.push(...(chainData as any))

    await storeRouteData('protocols-with-chains', data)
    await storeRouteData('protocols-lite-v1', protocolsLite)
    await storeRouteData('chains', chainData)
    await storeRouteData('v2/chains', chainDataV2)

    protocolList = cache.metadata.treasuries
    useNewChainNames = true
    includeTokenBreakdowns = true
    data = await getData()
    await storeRouteData('treasuries', data)

    protocolList = cache.metadata.entities
    useNewChainNames = true
    includeTokenBreakdowns = true
    data = await getData()
    await storeRouteData('entities', data)

    console.timeEnd('write /protocols')

    async function getData() {
      return craftAllProtocolResponse(useNewChainNames, protocolList, includeTokenBreakdowns, {
        getCoinMarkets: getCoinMarkets as any,
        getLastHourlyRecord: getLastHourlyRecord as any,
        getLastHourlyTokensUsd: getLastHourlyTokensUsd as any,
      })
    }
  }

  async function writeConfig() {
    console.time('write /config')
    const data = {
      protocols: cache.metadata.protocols,
      parentProtocols: cache.metadata.parentProtocols,
      chainCoingeckoIds: cache.metadata.chainCoingeckoIds,
      treasuries: cache.metadata.treasuries,
      entities: cache.metadata.entities,
      chainKeyToLabelMap,
    }
    await storeRouteData('configs', data)
    await storeRouteData('/_fe/static/configs', data)


    // this is handled in rest server now
    // const withConcurrency = 25

    // let items = shuffleArray(Object.entries(cache.protocolSlugMap))
    // await PromisePool.withConcurrency(withConcurrency).for(items)
    //   .process(async ([slugName, protocolData]: [string, IProtocol]) => {
    //     const key = `config/smol/${slugName}`
    //     await storeRouteData(key, protocolData)
    //   })
    console.timeEnd('write /config')
  }

  async function writeRaises() {
    console.time('write /raises')
    const data = await getRaisesInternal()
    await storeRouteData('raises', data)
    console.timeEnd('write /raises')
  }

  async function writeHacks() {
    console.time('write /hacks')
    const data = await getHacksInternal()
    await storeRouteData('hacks', data)
    console.timeEnd('write /hacks')
  }

  async function writeTokenRights() {
    console.time('write /token-rights')
    const data = await getTokenRightsInternal()
    await storeRouteData('token-rights', data)
    console.timeEnd('write /token-rights')
  }

  async function writeOracles() {
    const debugString = 'write /oracles'
    console.time(debugString)
    const data = await getOraclesInternal(processProtocolsOptions)

    // keep old cache file for old api routes
    await storeRouteData('oracles', data)
    
    // write breakdown oracles cache files for v2 routes
    await writeOraclesBreakdown(data);
    
    console.timeEnd(debugString)
    
    async function writeOraclesBreakdown(data: any) {
      // overview data without charts
      await storeRouteData('oracles-v2/overview', {
        oracles: data.oracles,
        chainsByOracle: data.chainsByOracle,
        oraclesTVS: data.oraclesTVS,
      })
      
      // total chart per key, key => timestamp => value
      const totalChartByKeys: Record<string, Record<number, number>> = {};
      // total chart per oracle, oracle => timestamp => value
      const totalChartByOracles: Record<string, Record<number, number>> = {};
      // total chart per chain, chain => timestamp => value
      const totalChartByChains: Record<string, Record<number, number>> = {};
      
      // total chart per key, key => timestamp => chain => value
      const totalChartByKeysAndChainBreakdown: Record<string, Record<number, Record<string, number>>> = {};
      // total chart per key, key => timestamp => protocol => value
      const totalChartByKeysAndProtocolBreakdown: Record<string, Record<number, Record<string, number>>> = {};
      
      // chart protocol chain-breakdown => key => timestamp => chain => value
      const totalChartByProtocolsAndChainBreakdown: Record<string, Record<number, Record<string, number>>> = {};

      // chart chain protocol-breakdown => key => timestamp => protocol => value
      const totalChartByChainsAndProtocolBreakdown: Record<string, Record<number, Record<string, number>>> = {};

      for (const [timestamp, oracles] of Object.entries(data.chainChart)) {
        const ts = Number(timestamp);
        const os = oracles as any;
        
        // { Chronicle: { Ethereum: 1, Ethereum-staking: 0 } }
        for (const [oracle, chains] of Object.entries(os)) {
          for (const [itemKey, itemValue] of Object.entries(chains as any)) {
            let [chain, key] = itemKey.split('-'); // Ethereum-staking
            if (key === undefined) key = 'tvl';

            // add to total
            ensureItemValue(totalChartByKeys, key, ts, Number(itemValue));
            ensureItemValue(totalChartByKeys, 'all', ts, Number(itemValue));
            
            // add to chain total
            ensureItemValue(totalChartByChains, `${chain}-${key}`, ts, Number(itemValue));
            ensureItemValue(totalChartByChains, `${chain}-all`, ts, Number(itemValue));
            
            // add to protocol total
            ensureItemValue(totalChartByOracles, `${oracle}-${key}`, ts, Number(itemValue));
            ensureItemValue(totalChartByOracles, `${oracle}-all`, ts, Number(itemValue));
            
            // add to total chain-breakdown
            ensureItemValueBreakdown(totalChartByKeysAndChainBreakdown, key, ts, chain, Number(itemValue));
            ensureItemValueBreakdown(totalChartByKeysAndChainBreakdown, 'all', ts, chain, Number(itemValue));
            
            // add to total protocol-breakdown
            ensureItemValueBreakdown(totalChartByKeysAndProtocolBreakdown, key, ts, oracle, Number(itemValue))
            ensureItemValueBreakdown(totalChartByKeysAndProtocolBreakdown, 'all', ts, oracle, Number(itemValue))
            
            // add to protocol chain-breakdown
            ensureItemValueBreakdown(totalChartByProtocolsAndChainBreakdown, `${oracle}-${key}`, ts, chain, Number(itemValue))
            ensureItemValueBreakdown(totalChartByProtocolsAndChainBreakdown, `${oracle}-all`, ts, chain, Number(itemValue))
            
            // add to chain protocol-breakdown
            ensureItemValueBreakdown(totalChartByChainsAndProtocolBreakdown, `${chain}-${key}`, ts, oracle, Number(itemValue))
            ensureItemValueBreakdown(totalChartByChainsAndProtocolBreakdown, `${chain}-all`, ts, oracle, Number(itemValue))
          }
        }
      }
      
      for (const [key, valueByTimestamp] of Object.entries(totalChartByKeys)) {
        await storeRouteData(`oracles-v2/charts/total-${key}`, buildTimeseriesItemValue(valueByTimestamp));
      }
      for (const [key, valueByTimestamp] of Object.entries(totalChartByKeysAndChainBreakdown)) {
        await storeRouteData(`oracles-v2/charts/total-${key}-chain-breakdown`, buildTimeseriesItemValueBreakdown(valueByTimestamp));
      }
      for (const [key, valueByTimestamp] of Object.entries(totalChartByKeysAndProtocolBreakdown)) {
        await storeRouteData(`oracles-v2/charts/total-${key}-protocol-breakdown`, buildTimeseriesItemValueBreakdown(valueByTimestamp));
      }
      
      for (const [key, valueByTimestamp] of Object.entries(totalChartByOracles)) {
        await storeRouteData(`oracles-v2/charts/protocols/${key}`, buildTimeseriesItemValue(valueByTimestamp));
      }
      for (const [key, valueByTimestamp] of Object.entries(totalChartByProtocolsAndChainBreakdown)) {
        await storeRouteData(`oracles-v2/charts/protocols/${key}-chain-breakdown`, buildTimeseriesItemValueBreakdown(valueByTimestamp));
      }

      for (const [key, valueByTimestamp] of Object.entries(totalChartByChains)) {
        await storeRouteData(`oracles-v2/charts/chains/${key}`, buildTimeseriesItemValue(valueByTimestamp));
      }
      for (const [key, valueByTimestamp] of Object.entries(totalChartByChainsAndProtocolBreakdown)) {
        await storeRouteData(`oracles-v2/charts/chains/${key}-protocol-breakdown`, buildTimeseriesItemValueBreakdown(valueByTimestamp));
      }
    }
  }

  async function writeForks() {
    const debugString = 'write /forks'
    console.time(debugString)
    const data = await getForksInternal(processProtocolsOptions)

    // keep old cache file for old api routes
    await storeRouteData('forks', data)
    
    // write breakdown forks cache files for v2 routes
    await writeForksBreakdown(data);
    
    console.timeEnd(debugString)
    
    async function writeForksBreakdown(data: any) {
      // overview data without charts
      await storeRouteData('forks-v2/overview', data.forks)
      
      // key => timestamp => protocol => value
      const chartByKeys: Record<string, Record<number, Record<string, number>>> = {};
      
      // protocol => timestamp => value
      const chartByProtocols: Record<string, Record<number, number>> = {};
      
      for (const [timestamp, forks] of Object.entries(data.chart)) {
        for (const [protocol, items] of Object.entries(forks as any)) {
          for (const [key, value] of Object.entries(items as any)) {
            ensureItemValue(chartByProtocols, `${protocol}-${key}`, Number(timestamp), Number(value));
            ensureItemValue(chartByProtocols, `${protocol}-all`, Number(timestamp), Number(value));
            
            ensureItemValueBreakdown(chartByKeys, `total-${key}-protocol-breakdown`, Number(timestamp), protocol, Number(value));
            ensureItemValueBreakdown(chartByKeys, 'total-all-protocol-breakdown', Number(timestamp), protocol, Number(value));
          }
        }
      }
      
      for (const [key, valueByTimestamp] of Object.entries(chartByKeys)) {
        await storeRouteData(`forks-v2/charts/${key}`, buildTimeseriesItemValueBreakdown(valueByTimestamp));
      }

      for (const [key, valueByTimestamp] of Object.entries(chartByProtocols)) {
        await storeRouteData(`forks-v2/charts/protocols/${key}`, buildTimeseriesItemValue(valueByTimestamp));
      }
    }
  }

  async function writeCategories() {
    const debugString = 'write /categories'
    console.time(debugString)
    const data = await getCategoriesInternal(processProtocolsOptions)
    await storeRouteData('categories', data)
    console.timeEnd(debugString)
  }

  async function writeProtocolsChart() {
    const debugString = 'write /lite/protocols2'
    console.time(debugString)
    const { protocols2Data, v2ProtocolData } = await storeGetProtocols({ getCoinMarkets, getLastHourlyRecord, getLastHourlyTokensUsd, getYesterdayTvl, getLastWeekTvl, getLastMonthTvl, getYesterdayTokensUsd, getLastWeekTokensUsd, getLastMonthTokensUsd, })
    await storeRouteData('lite/protocols2', protocols2Data)
    await storeRouteData('lite/v2/protocols', v2ProtocolData)
    console.timeEnd(debugString)
  }

  async function writeBitcoinAddressesFile() {
    try {

      const debugString = 'write /config/smol/bitcoin-addresses'
      console.time(debugString)
      const Bucket = "tvl-adapter-cache"
      const data = await await sdk.cache.readCache(`${Bucket}/bitcoin-addresses.json`)
      await storeRouteData('/config/smol/bitcoin-addresses.json', data)
      console.timeEnd(debugString)
    } catch (e) {
      console.error(e)
    }
  }

  async function addProtocolAppMetadataToCache() {
    console.time('addProtocolAppMetadataToCache')
    try {

      cache.metadata.protocolAppMetadata = await readRouteData('/config/smol/appMetadata-protocols.json') ?? {}

    } catch (e) {
      console.error('Error reading appMetadata-protocols.json:', e)
      cache.metadata.protocolAppMetadata = {}
    }
    console.timeEnd('addProtocolAppMetadataToCache')
  }
}

async function getChainData(isV2: boolean) {
  return craftChainsResponse(isV2, isV2, {
    protocolList: cache.metadata.protocols,
    getLastHourlyRecord: getLastHourlyRecord as any,
  })

}


async function storeRWAStats() {
  try {

    const debugString = 'write /config/smol/rwa-stats'
    console.time(debugString)
    const data = await fetchRWAStats()
    await storeRouteData('/rwa/stats', data)
    console.timeEnd(debugString)
  } catch (e) {
    console.error(e)
  }
}


async function storeActiveUsers() {
  try {

    const debugString = 'write /activeUsers'
    console.time(debugString)
    const data = await getActiveUsers()
    await storeRouteData('/activeUsers', data)
    console.timeEnd(debugString)
  } catch (e) {
    console.error(e)
  }
}

function ensureItemValue(items: Record<string, Record<number, number>>, key: string, ts: number, value: number) {
  items[key] = items[key] || {};
  items[key][ts] = items[key][ts] || 0;
  items[key][ts] += Number(value);
}

function ensureItemValueBreakdown(items: Record<string, Record<number, Record<string, number>>>, key: string, ts: number, label: string, value: number) {
  items[key] = items[key] || {};
  items[key][ts] = items[key][ts] || {};
  items[key][ts][label] = items[key][ts][label] || 0;
  items[key][ts][label] += Number(value);
}

function buildTimeseriesItemValue(valueByTimestamp: Record<number, number>): Array<Array<number>> {
  const shortedItem: Array<Array<number>> = [];
  for (const [timestamp, value] of Object.entries(valueByTimestamp)) {
    shortedItem.push([Number(timestamp), value]);
  }
  return shortedItem.sort((a, b) => a[0] > b[0] ? 1 : -1);
}

function buildTimeseriesItemValueBreakdown(valueByTimestamp: Record<number, Record<string, number>>): Array<any> {
  const shortedItem: Array<any> = [];
  for (const [timestamp, labelsAndValues] of Object.entries(valueByTimestamp)) {
    shortedItem.push({
      timestamp: Number(timestamp),
      ...labelsAndValues,
    });
  }
  return shortedItem.sort((a, b) => a.timestamp > b.timestamp ? 1 : -1);
}

runWithRuntimeLogging(run, {
  application: "cron-task",
  type: 'tvl-data',
})
  .then(genFormattedChains)
  .catch(async e => {
    console.error(e)
    const errorMessage = (e as any)?.message ?? (e as any)?.stack ?? JSON.stringify(e)
    if (process.env.DIM_ERROR_CHANNEL_WEBHOOK)
      await sendMessage(errorMessage, process.env.DIM_ERROR_CHANNEL_WEBHOOK!)
  })
  .then(() => process.exit(0))
