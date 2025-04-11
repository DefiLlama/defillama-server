/**
 * 
 * Almost all of this code is copied from here: 
 * https://github.com/DefiLlama/defillama-app/blob/main/src/api/categories/protocols/getProtocolData.tsx
 */


import { getMetadataAll, readRouteData, storeRouteData } from '../cache/file-cache'
import { cache } from '@defillama/sdk'
import { colord } from 'colord'

import fetch from "node-fetch";
import { pullDevMetricsData } from './githubMetrics';
import { chainCoingeckoIds } from '../../utils/normalizeChain';
import protocols from '../../protocols/data';
import parentProtocols from '../../protocols/parentProtocols';
const { exec } = require('child_process');

const protocolInfoMap: any = {}
const parentProtocolsInfoMap: any = {}
const protocolChainSetMap: {
  [key: string]: Set<string>
} = {}

parentProtocols.forEach((protocol: any) => {
  parentProtocolsInfoMap[protocol.id] = protocol
  protocolChainSetMap[protocol.id] = new Set(protocol.chains ?? [])
  protocol.chainSet = protocolChainSetMap[protocol.id]
  protocol.childProtocols = []
})

protocols.forEach((protocol: any) => {
  protocolInfoMap[protocol.id] = protocol
  protocolChainSetMap[protocol.id] = new Set(protocol.chains ?? [])
  protocol.chainSet = protocolChainSetMap[protocol.id]
  if (protocol.parentProtocol) {
    parentProtocolsInfoMap[protocol.parentProtocol].childProtocols.push(protocol)
  }
})


const fetchJson = async (url: string) => fetch(url).then(res => res.json())
const slugMap: any = {}

const slug = (tokenName = '') => {
  if (!slugMap[tokenName]) slugMap[tokenName] = tokenName?.toLowerCase().split(' ').join('-').split("'").join('')
  return slugMap[tokenName]
}

export async function storeAppMetadata() {
  console.log('starting to build metadata for front-end')
  try {
    await pullRaisesDataIfMissing()
    await pullDevMetricsData()
    await _storeAppMetadata()
  } catch (e) {
    console.log('Error in storeAppMetadata: ')
    console.error(e)
  }
}

async function pullRaisesDataIfMissing() {
  const raises = await readRouteData('/raises')
  if (!raises) {
    await new Promise((resolve, reject) => {
      exec('npm run cron-raises', (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return reject(error);
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        resolve(stdout);
      });
    });
  }
}


async function _storeAppMetadata() {


  const finalProtocols: any = {}
  const finalChains: any = {}
  const articlesTagMap: any = {}
  const githubReportMap: any = {}
  const nftExchangeVolumeMap: any = {}
  const protocolMetadataMap: any = {}
  const parentProtocolMetadataMap: any = {}
  const raisesProtocolMap: any = {}
  const expensesMap: any = {}
  const dimensionsMap: any = {}
  const protocolCategoriesMap: any = {}
  const devMetricsMap: any = {}
  const treasuriesMap: any = {}
  const yieldPoolsProtocolMap: any = {}
  const liquidityTokenPoolsMap: any = {}
  const hacksMap: any = {}
  const emissionsProtocolMap: any = {}
  const chartDenominationsChainMap: any = {}

  const protocolMetadata = finalProtocols

  const [
    tvlData,
    yieldsData,
    expensesData,
    treasuryData,
    liquidityData,
    hacksData,
    nftMarketplacesData,
    raisesData,
    activeUsersData,
    feesData,
    revenueData,
    feeBribeRevenueData,
    feeTokenTaxData,
    volumeData,
    perpsData,
    aggregatorsData,
    optionsData,
    perpsAggregatorsData,
    bridgeAggregatorsData,
    emmissionsData,
    bridgesData,
    chainAssetsData,
    chainsData,
    forksData,
    articles,
    yieldsConfig,
    protocolPalettes,
    allDevMetricsData,
    allNFTVolumes,
    allMetadata,
    emmissionsDataAll,
  ] = await Promise.all([
    readRouteData('/lite/protocols2'),
    fetchJson(YIELD_POOLS_API).then((res) => res.data ?? []),
    fetchJson(PROTOCOLS_EXPENSES_API).catch(() => ([])),
    readRouteData('/treasuries').catch(() => ([])),
    fetchJson(LIQUIDITY_API).catch(() => ([])),
    readRouteData('/hacks').catch(() => ([])),
    fetchJson(NFT_MARKETPLACES_STATS_API).catch(() => ([])),
    readRouteData('/raises').catch(() => ({ raises: [] })),
    fetchJson(ACTIVE_USERS_API).catch(() => ({})),
    readRouteData('/dimensions/fees/df-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/fees/dr-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/fees/dbr-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/fees/dtt-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/dexs/dv-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/derivatives/dv-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/aggregators/dv-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/options/dnv-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/aggregator-derivatives/dv-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/bridge-aggregators/dbv-lite').catch(() => ({ protocols: {} })),
    fetchJson(`https://defillama-datasets.llama.fi/emissionsProtocolsList`).catch(() => ([])),
    fetchJson(`${BRIDGES_API}?includeChains=true`).catch(() => ({ chains: [] })),
    fetchJson(CHAINS_ASSETS).catch(() => ({})),
    readRouteData('/chains').catch(() => ([])),
    readRouteData('/forks').catch(() => ({ forks: {} })),
    fetchJson(`${ARTICLES_API}`).catch(() => ({})),
    fetchJson(YIELD_CONFIG_API).catch(() => ({ protocols: {} })),
    cache.readCache('icons/protocols-colors.json', { readFromR2Cache: true, }).catch(() => ({})),
    pullDevMetricsData().catch(() => ([])),
    fetchJson(NFT_MARKETPLACES_VOLUME_API).catch(() => ([])),
    getMetadataAll(),
    fetchJson(EMISSIONS_API).catch(() => ([])),
  ])


  const dimensionsConfig = [
    {
      mapKey: 'fees', data: feesData, finalDataKeys: {
        dailyFees: 'total24h',
        fees30d: 'total30d',
        allTimeFees: 'totalAllTime',
      }
    },
    {
      mapKey: 'revenue', data: revenueData, finalDataKeys: {
        dailyRevenue: 'total24h',
        revenue30d: 'total30d',
      }
    },
    {
      mapKey: 'bribe', data: feeBribeRevenueData, finalDataKeys: {
        dailyBribesRevenue: 'total24h',
        bribesRevenue30d: 'total30d',
      }
    },
    {
      mapKey: 'tokenTax', data: feeTokenTaxData, finalDataKeys: {
        dailyTokenTaxes: 'total24h',
        tokenTaxesRevenue30d: 'total30d',
      }
    },
    {
      mapKey: 'volume', data: volumeData, finalDataKeys: {
        dailyVolume: 'total24h',
        allTimeVolume: 'totalAllTime',
      }
    },
    {
      mapKey: 'derivatives', data: perpsData, finalDataKeys: {
        dailyPerpsVolume: 'total24h',
        allTimePerpsVolume: 'totalAllTime',
      }
    },
    {
      mapKey: 'aggregators', data: aggregatorsData, finalDataKeys: {
        dailyAggregatorsVolume: 'total24h',
        allTimeAggregatorsVolume: 'totalAllTime',
      }
    },
    {
      mapKey: 'options', data: optionsData, finalDataKeys: {
        dailyOptionsVolume: 'total24h',
      }
    },
    {
      mapKey: 'perpsAggregators', data: perpsAggregatorsData, finalDataKeys: {
        dailyPerpsAggregatorVolume: 'total24h',
        allTimePerpsAggregatorVolume: 'totalAllTime',
      }
    },
  ]

  // missing cg data, governance & yield median

  createDataMaps()

  await _storeMetadataFile()
  await _storeProtocolData()

  function createDataMaps() {

    // create yield project map
    yieldsData.forEach((pool: any) => {
      if (!yieldPoolsProtocolMap[pool.project]) yieldPoolsProtocolMap[pool.project] = []
      yieldPoolsProtocolMap[pool.project].push(pool)
    })

    // map articles to tags
    articles?.content_elements?.forEach((article: any) => {
      article?.taxonomy?.tags?.forEach((tag: any) => {
        const text = tag.text.toLowerCase()
        if (!articlesTagMap[text]) {
          articlesTagMap[text] = []
        }
        articlesTagMap[text].push(article)
      })
    })

    // link github reports to protocol ids
    allDevMetricsData.map((report: any) => githubReportMap[report.project_id] = report)

    // nft exchange volume
    allNFTVolumes.map(({ day, sum, sumUsd, exchangeName }: any) => {
      const slugName = slug(exchangeName)
      if (!nftExchangeVolumeMap[slugName]) {
        nftExchangeVolumeMap[slugName] = []
      }
      nftExchangeVolumeMap[slugName].push({ date: day, volume: sum, volumeUsd: sumUsd })
    })

    // map protocol metadata
    allMetadata.parentProtocols.forEach((protocol: any) => {
      parentProtocolMetadataMap[protocol.id] = protocol
    })

    allMetadata.protocols.forEach((protocol: any) => {
      protocolMetadataMap[protocol.id] = protocol
      if (protocol.parentProtocol && parentProtocolMetadataMap[protocol.parentProtocol]) {
        const ppInfo = parentProtocolMetadataMap[protocol.parentProtocol]
        protocolMetadataMap[protocol.id].parentProtocolInfo = ppInfo
        if (!ppInfo.childProtocolsInfo)
          ppInfo.childProtocolsInfo = []
        ppInfo.childProtocolsInfo.push(protocol)
      }

    })

    tvlData.protocols.forEach((protocol: any) => {

      if (protocol.category) {
        if (!protocolCategoriesMap[protocol.category]) {
          protocolCategoriesMap[protocol.category] = []
        }
        protocolCategoriesMap[protocol.category].push(protocol)
      }
    })


    // raises
    raisesData.raises.forEach((raise: any) => {
      if (!raise.defillamaId) return;
      if (!raisesProtocolMap[raise.defillamaId]) {
        raisesProtocolMap[raise.defillamaId] = []
      }
      raisesProtocolMap[raise.defillamaId].push(raise)
    })

    // expenses
    expensesData.forEach((expense: any) => {
      if (!expense.protocolId) return;
      expensesMap[expense.protocolId] = expense
    })


    // create dimensions map
    dimensionsConfig.forEach(({ mapKey, data, }: any) => {
      const dataMap: any = {}
      dimensionsMap[mapKey] = dataMap
      data.protocols.map((pData: any) => {
        let id = pData.id ?? pData.defillamaId ?? pData.name
        if (protocolChainSetMap[id] && pData.chains?.length) {
          const protocolChainSet = protocolChainSetMap[id]
          pData.chains.forEach((chain: any) => {
              protocolChainSet.add(chain)
          })
        }

        if (!pData.hasOwnProperty('total24h')) return; // skip if this total24h field is missing
        if (pData.id) dataMap[pData.id] = pData
        if (pData.defillamaId)  dataMap[pData.defillamaId] = pData
        if (pData.name) dataMap[pData.name] = pData
      })
    })

    // dev metrics
    allDevMetricsData.forEach((devMetric: any) => {
      devMetricsMap[devMetric.project_id] = devMetric
    })


    // treasuries
    treasuryData.forEach((treasury: any) => {
      if (typeof treasury.id === 'string')
        treasuriesMap[treasury.id.replace('-treasury', '')] = treasury
    })

    // liquidity
    liquidityData.forEach((pool: any) => {
      liquidityTokenPoolsMap[pool.id] = pool
    })

    // hacks
    hacksData.forEach((hack: any) => {
      if (!hack.defillamaId && !hack.protocolId) return;
      const key = (hack.defillamaId ? hack.defillamaId : hack.protocolId) + ''
      if (!hacksMap[key]) {
        hacksMap[key] = []
      }
      hacksMap[key].push(hack)
    })

    // emissions
    emmissionsDataAll.forEach((emission: any) => {
      if (emission.protocolId)
        emissionsProtocolMap[emission.protocolId] = emission
    })

    // chart denominations
    const chainDenominationsKeys = ['geckoId', 'cmcId', 'symbol']
    Object.entries(chainCoingeckoIds).map(([chain, data]: any) => {
      let obj: any = {}
      chainDenominationsKeys.forEach((key) => {
        obj[key] = data[key] ?? null
      })
      if (data.parent?.chain === 'Ethereum') 
        obj = {
          "geckoId": "ethereum",
          "cmcId": "1027",
          "symbol": "ETH"
        }
      chartDenominationsChainMap[chain] = obj
    })
  }

  async function _storeMetadataFile() {

    for (const chain of tvlData.chains) {
      finalChains[slug(chain)] = { name: chain }
    }

    const nameToId: any = {}
    const parentToChildProtocols: any = {}
    for (const protocol of tvlData.protocols) {
      nameToId[protocol.defillamaId] = protocol.name
      const name = slug(protocol.name)
      finalProtocols[protocol.defillamaId] = {
        name,
        tvl: protocol.tvl ? true : false,
        yields: yieldsData.find((pool: any) => pool.project === name) ? true : false,
        ...(protocol.governanceID ? { governance: true } : {}),
        ...(forksData.forks[protocol.name] ? { forks: true } : {})
      }

      if (protocol.parentProtocol) {
        parentToChildProtocols[protocol.parentProtocol] = [...(parentToChildProtocols[protocol.parentProtocol] ?? []), name]
        if (protocol.tvl) {
          finalProtocols[protocol.parentProtocol] = {
            ...finalProtocols[protocol.parentProtocol],
            tvl: true
          }
        }
      }
    }
    for (const protocol of tvlData.parentProtocols) {
      nameToId[protocol.id] = protocol.name

      const name = slug(protocol.name)
      finalProtocols[protocol.id] = {
        name,
        yields: yieldsData.find(
          (pool: any) => pool.project === name || parentToChildProtocols[protocol.id]?.includes(pool.project)
        )
          ? true
          : false,
        ...finalProtocols[protocol.id],
        ...(protocol.governanceID ? { governance: true } : {}),
        ...(forksData.forks[protocol.name] ? { forks: true } : {})
      }
    }

    for (const protocol of expensesData) {
      finalProtocols[protocol.protocolId] = {
        ...finalProtocols[protocol.protocolId],
        expenses: true
      }
    }

    for (const protocol of treasuryData) {
      finalProtocols[protocol.id.split('-treasury')[0]] = {
        ...finalProtocols[protocol.id.split('-treasury')[0]],
        treasury: true
      }
    }

    for (const protocol of liquidityData) {
      finalProtocols[protocol.id] = {
        ...finalProtocols[protocol.id],
        liquidity: true
      }
    }

    // todo forks api

    for (const protocol of hacksData) {
      if (protocol.defillamaId) {
        finalProtocols[protocol.defillamaId.toString()] = {
          ...finalProtocols[protocol.defillamaId.toString()],
          hacks: true
        }
      }
    }

    for (const market of nftMarketplacesData) {
      const marketplaceExists = Object.entries(nameToId).find(
        (protocol) => slug(market.exchangeName) === slug(protocol[1] as string)
      ) as [string, string] | undefined
      if (marketplaceExists) {
        finalProtocols[marketplaceExists[0]] = {
          ...finalProtocols[marketplaceExists[0]],
          nfts: true
        }
      }
    }

    for (const raise of raisesData.raises) {
      if (raise.defillamaId && !raise.defillamaId.startsWith('chain')) {
        finalProtocols[raise.defillamaId] = {
          ...finalProtocols[raise.defillamaId],
          raises: true
        }
      }
    }

    for (const protocol in activeUsersData) {
      if (protocol.startsWith('chain')) {
        const chain = Object.keys(finalChains).find((chain) => protocol === `chain#${chain.toLowerCase()}`)
        if (chain) {
          finalChains[slug(chain)] = {
            ...(finalChains[slug(chain)] ?? { name: chain }),
            activeUsers: true
          }
        }
      } else {
        finalProtocols[protocol] = {
          ...finalProtocols[protocol],
          activeUsers: true
        }
      }
    }

    for (const protocol of feesData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        fees: true
      }

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          fees: true
        }
      }
    }

    for (const chain of feesData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        fees: true
      }
    }

    const chainsWithFees = feesData.protocols.filter((i: any) => i.defillamaId.startsWith('chain#')).map((i: any) => i.name)
    for (const chain of chainsWithFees) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        displayName: chain,
        chainFees: true
      }
    }

    for (const protocol of revenueData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        revenue: true
      }

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          revenue: true
        }
      }
    }

    for (const protocol of volumeData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        dexs: true
      }

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          dexs: true
        }
      }
    }
    for (const chain of volumeData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        dexs: true
      }
    }

    for (const protocol of perpsData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        perps: true
      }

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          perps: true
        }
      }
    }
    for (const chain of perpsData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        derivatives: true
      }
    }

    for (const protocol of aggregatorsData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        aggregator: true
      }

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          aggregator: true
        }
      }
    }
    for (const chain of aggregatorsData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        aggregators: true
      }
    }

    for (const protocol of optionsData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        options: true
      }

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          options: true
        }
      }
    }
    for (const chain of optionsData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        options: true
      }
    }

    for (const protocol of perpsAggregatorsData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        perpsAggregators: true
      }

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          perpsAggregators: true
        }
      }
    }
    for (const chain of perpsAggregatorsData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        'aggregator-derivatives': true
      }
    }

    for (const protocol of bridgeAggregatorsData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        bridgeAggregators: true
      }

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          bridgeAggregators: true
        }
      }
    }
    for (const chain of bridgeAggregatorsData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        'bridge-aggregators': true
      }
    }

    for (const protocol of Object.entries(nameToId)) {
      if (emmissionsData.includes(slug(protocol[1] as string))) {
        finalProtocols[protocol[0]] = {
          ...finalProtocols[protocol[0]],
          emissions: true
        }
      }
    }

    const sortedProtocolData = Object.keys(finalProtocols)
      .sort()
      .reduce((r: any, k) => {
        r[k] = finalProtocols[k]
        if (protocolInfoMap[k]) {
          r[k].displayName = protocolInfoMap[k].name
          r[k].chains = protocolInfoMap[k].chainSet ? Array.from(protocolInfoMap[k].chainSet) : []
        }
        if (parentProtocolsInfoMap[k]) {
          r[k].displayName = parentProtocolsInfoMap[k].name
          const chainSet = new Set()
          parentProtocolsInfoMap[k].childProtocols?.forEach((p: any) => {
            const chains = p.chainSet ? Array.from(p.chainSet) : []
            chains.forEach((chain: any) => chainSet.add(chain))
          })
          r[k].chains = Array.from(chainSet)
        }
        return r
      }, {})

    await storeRouteData('/config/smol/appMetadata-protocols.json', sortedProtocolData)


    for (const chain of bridgesData.chains) {
      if (finalChains[slug(chain.name)]) {
        finalChains[slug(chain.name)] = { ...(finalChains[slug(chain.name)] ?? { name: chain.name }), inflows: true }
      }
    }

    for (const chain in chainAssetsData) {
      if (finalChains[slug(chain)]) {
        finalChains[slug(chain)] = { ...(finalChains[slug(chain)] ?? { name: chain }), chainAssets: true }
      }
    }

    for (const chain of chainsData) {
      if (finalChains[slug(chain.name)] && chain.gecko_id) {
        finalChains[slug(chain.name)] = {
          ...(finalChains[slug(chain.name)] ?? { name: chain.name }),
          gecko_id: chain.gecko_id,
          tokenSymbol: chain.tokenSymbol
        }
      }
    }

    const sortedChainData = Object.keys(finalChains)
      .sort()
      .reduce((r: any, k) => ((r[k] = finalChains[k]), r), {})

    await storeRouteData('/config/smol/appMetadata-chains.json', sortedChainData)
    console.log('finished building metadata')
  }

  async function _storeProtocolData() {


    for (const protocol of tvlData.protocols)
      await storeProtocolFEData(protocol, false)


    for (const protocol of tvlData.parentProtocols)
      await storeProtocolFEData(protocol, true)


    function getPalatte(protocolName: string) {
      const DEFAULT_COLOR = "#2172E5"

      const nameToId = (name: string) => name
        .trim()
        .toLowerCase()
        .replace(/[()'’]/g, '') // Remove parentheses and single quotes
        .replace(/\s+/g, '-'); // Replace spaces with hyphens
      return protocolPalettes[nameToId(protocolName)] ?? DEFAULT_COLOR
    }

    function fetchProtocolArticles({ tags = '', size = 2, }: any) {
      if (!tags) return []
      tags = tags.toLowerCase()
      if (!articlesTagMap[tags]) return []

      return articlesTagMap[tags].slice(0, size).map((element: any) => ({
        headline: element.headlines.basic,
        date: element.display_date,
        href: `https://dlnews.com${element.canonical_url}`,
        imgSrc: element.promo_items?.basic?.url ?? null
      }))
    }

    async function storeProtocolFEData(protocolData?: any, isParentProtocol?: boolean) {

      const slugName = slug(protocolData.name)
      const protocolId = protocolData.id ?? protocolData.defillamaId
      let parentProtocolId = undefined
      let childProtocolSlugs = []
      let childProtocolIds = []
      if (!isParentProtocol) parentProtocolId = protocolData.parentProtocol
      else {
        childProtocolSlugs = parentProtocolMetadataMap[protocolId]?.childProtocolsInfo.map((i: any) => i.name).map(sluggify) ?? []
        childProtocolIds = parentProtocolMetadataMap[protocolId]?.childProtocolsInfo.map((i: any) => i.defillamaId ?? i.id) ?? []
      }

      // check if we show inflows
      let inflowsExist = false

      if (isParentProtocol) {
        inflowsExist = !parentProtocolMetadataMap[protocolId]?.childProtocolsInfo.some((i: any) => i.misrepresentedTokens)
      } else {
        inflowsExist = !protocolData.misrepresentedTokens
      }


      // raises data

      let protocolRaises = raisesProtocolMap[protocolId]
      if (!protocolRaises && parentProtocolId) protocolRaises = raisesProtocolMap[parentProtocolId]
      if (protocolRaises?.length > 0) protocolData.raises = protocolRaises



      // chart colors
      const chartTypes = [
        'TVL',
        'Mcap',
        'Token Price',
        'FDV',
        'Fees',
        'Revenue',
        'Volume',
        'Perps Volume',
        'Unlocks',
        'Active Addresses',
        'New Addresses',
        'Transactions',
        'Gas Used',
        'Staking',
        'Borrowed',
        'Median APY',
        'USD Inflows',
        'Total Proposals',
        'Successful Proposals',
        'Max Votes',
        'Treasury',
        'Bridge Deposits',
        'Bridge Withdrawals',
        'Token Volume',
        'Token Liquidity',
        'Tweets',
        'Developers',
        'Contributers',
        'Devs Commits',
        'Contributers Commits',
        'NFT Volume',
        'Premium Volume',
        'Perps Aggregators Volume',
        'Bridge Aggregators Volume'
      ]


      const backgroundColor = getPalatte(protocolData.name)
      const colorTones = Object.fromEntries(chartTypes.map((type, index) => [type, selectColor(index, backgroundColor)]))





      // Dev Metrics data
      let devMetrics = devMetricsMap[protocolId] ?? null
      if (!devMetrics && parentProtocolId) devMetrics = devMetricsMap[parentProtocolId] ?? null




      // dimensions data
      // const metrics = protocolData.metrics || {}
      const dimensionMetrics: any = {}
      let feesData: any = []
      let revenueData: any = []

      dimensionsConfig.forEach(({ mapKey, finalDataKeys }: any) => {
        const allData = dimensionsMap[mapKey]
        const getData = (p: any) => allData[p.defillamaId ?? p.id] ?? allData[p.name]
        let data
        if (isParentProtocol) {
          const childProtocols = parentProtocolMetadataMap[protocolId]?.childProtocolsInfo ?? []
          data = childProtocols.map(getData).filter((d: any) => d)
        } else {
          data = getData(protocolData)
          if (data) data = [data]
        }

        if (!data?.length) data = []
        else {
          if (!protocolData.chains?.length) {
            const allChains = data.map((d: any) => d.chains).flat()
            protocolData.chains = Array.from(new Set(allChains))
          }
        }

        switch (mapKey) {
          case 'fees': feesData = data; break;
          case 'revenue': revenueData = data; break;
        }

        Object.entries(finalDataKeys).forEach(([responseKey, dimensionsKey]: any) => {
          if (!data?.length) {
            dimensionMetrics[responseKey] = null
            return;
          }
          dimensionMetrics[responseKey] = data?.reduce((acc: any, curr: any) => (acc += curr[dimensionsKey] || 0), 0) ?? null
        })

      })



      // similar protocols

      let similarProtocols = []

      if (!isParentProtocol && protocolData.category) {
        const protocolChainSet = new Set(protocolData.chains ?? [])
        similarProtocols = protocolCategoriesMap[protocolData.category]?.filter((p: any) => p.name !== protocolData.name) ?? []
        similarProtocols = similarProtocols.map((p: any) => {
          let commonChains = p.chains.filter((chain: any) => protocolChainSet.has(chain)).length
          return { name: p.name, tvl: p.tvl, commonChains }
        }).sort((a: any, b: any) => b.tvl - a.tvl)
      }


      const similarProtocolsSet = new Set()

      const protocolsWithCommonChains = [...similarProtocols].sort((a, b) => b.commonChains - a.commonChains).slice(0, 10)

      // first 5 are the protocols that are on same chain + same category
      protocolsWithCommonChains.forEach((p) => similarProtocolsSet.add(p.name))

      // last 5 are the protocols in same category
      // similarProtocols.forEach((p: any) => {
      //   if (similarProtocolsSet.size < 10) {
      //     similarProtocolsSet.add(p.name)
      //   }
      // })





      // NFT Volume data
      let nftVolumeData = nftExchangeVolumeMap[slugName] ?? []




      // treasury data
      let treasury = treasuriesMap[protocolId] ?? null
      if (!treasury && !isParentProtocol) treasury = treasuriesMap[parentProtocolId] ?? null




      // expenses data
      let expenses = expensesMap[protocolId] ?? null
      if (!expenses && !isParentProtocol) expenses = expensesMap[parentProtocolId] ?? null



      // hacks data
      let hacksData = hacksMap[protocolId ?? protocolData.defillamaId] ?? null
      // if (!hacksData && parentProtocolId) hacksData = hacksMap[parentProtocolId] ?? null
      if (!hacksData && isParentProtocol) {
        hacksData = []
        childProtocolIds.forEach((id: any) => {
          hacksData.push(...(hacksMap[id] ?? []))
        })
        
      }
      if (hacksData) hacksData = hacksData.sort((a: any, b: any) => b.date - a.date)



      // yield data
      let projectNames = protocolData?.otherProtocols?.map(sluggify) ?? []
      projectNames = [...projectNames, slugName]
      if (isParentProtocol) projectNames.push(...childProtocolSlugs)
      const projectYields: any = []
      projectNames.forEach((p: any) => {
        if (yieldPoolsProtocolMap[p]) {
          projectYields.push(...yieldPoolsProtocolMap[p])
        }
      })




      // token liquidity
      let tokenPools = liquidityTokenPoolsMap[protocolId]?.tokenPools ?? []
      if (!tokenPools.length && parentProtocolId) tokenPools = liquidityTokenPoolsMap[parentProtocolId]?.tokenPools ?? []

      const liquidityAggregated = tokenPools.reduce((agg: any, pool: any) => {
        if (!agg[pool.project]) agg[pool.project] = {}
        agg[pool.project][pool.chain] = pool.tvlUsd + (agg[pool.project][pool.chain] ?? 0)
        return agg
      }, {})

      const tokenLiquidity = yieldsConfig
        ? Object.entries(liquidityAggregated)
          .filter((x) => (yieldsConfig.protocols[x[0]]?.name ? true : false))
          .map((p: any) => Object.entries(p[1]).map((c) => [yieldsConfig.protocols[p[0]].name, c[0], c[1]]))
          .flat()
          .sort((a, b) => b[2] - a[2])
        : []



      // active users data
      let users = activeUsersData[protocolId] ?? null



      // emissions data

      let upcomingEvent: any = []
      let emissions = emissionsProtocolMap[protocolId] ?? null
      if (!emissions && parentProtocolId) emissions = emissionsProtocolMap[parentProtocolId] ?? null

      if (emissions) {
        const protocolUpcomingEvent = emissions?.events?.find((e: any) => e.timestamp >= Date.now() / 1000)
        const upcomingEventTS = protocolUpcomingEvent?.timestamp ?? null
        if (
          !protocolUpcomingEvent ||
          (protocolUpcomingEvent.noOfTokens.length === 1 && protocolUpcomingEvent.noOfTokens[0] === 0)
        ) {
          upcomingEvent = [{ timestamp: null }]
        } else {
          const comingEvents = emissions?.events?.filter((e: any) => e.timestamp === upcomingEventTS) ?? []
          upcomingEvent = [...comingEvents]
        }

      }

      const chartDenominations = []

      if (protocolData.chains && protocolData.chains.length > 0) {
        chartDenominations.push({ symbol: 'USD', geckoId: null })

        if (chartDenominationsChainMap[protocolData.chains[0]]?.geckoId) {
          chartDenominations.push(chartDenominationsChainMap[protocolData.chains[0]])
        } else {
          chartDenominations.push(chartDenominationsChainMap['Ethereum'])
        }
      }

      let tvlMethodolodyUrl = null
      if (!isParentProtocol && protocolInfoMap[protocolId]?.module) {
        tvlMethodolodyUrl = `https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/${protocolInfoMap[protocolId]?.module}`
      }

      const data = {
        articles: fetchProtocolArticles({ tags: protocolData.name }),
        // protocol,
        devMetrics,
        nftVolumeData,
        protocolData: {
          // ...protocolData,
          symbol: protocolData.symbol ?? null,
          metrics: {
            // ...metrics,
            tvl: !!protocolMetadata[protocolId]?.tvl,
            devMetrics: !!devMetrics,
            fees: !!protocolMetadata[protocolId]?.fees,
            revenue: !!protocolMetadata[protocolId]?.revenue,
            dexs: !!protocolMetadata[protocolId]?.dexs,
            perps: !!protocolMetadata[protocolId]?.perps,
            aggregators: !!protocolMetadata[protocolId]?.aggregator,
            perpsAggregators: !!protocolMetadata[protocolId]?.perpsAggregators,
            bridgeAggregators: !!protocolMetadata[protocolId]?.bridgeAggregators,
            options: !!protocolMetadata[protocolId]?.options,
            // medianApy: medianApy.data.length > 0,
            inflows: inflowsExist,
            unlocks: !!protocolMetadata[protocolId]?.unlocks,
            bridge: protocolData.category === 'Bridge' || protocolData.category === 'Cross Chain',
            treasury: !!protocolMetadata[protocolId]?.treasury,
            tokenLiquidity: !!protocolMetadata[protocolId]?.liquidity,
            nftVolume: (nftVolumeData?.length ?? 0) > 0,
            yields: projectYields.length > 0,
            forks: !!protocolMetadata[protocolId]?.forks,
          }
        },
        backgroundColor,
        similarProtocols: Array.from(similarProtocolsSet).map((protocolName) =>
          similarProtocols.find((p: any) => p.name === protocolName)
        ),
        chartColors: colorTones,
        users: users
          ? {
            activeUsers: users.users?.value ?? null,
            newUsers: users.newUsers?.value ?? null,
            transactions: users.txs?.value ?? null,
            gasUsd: users.gasUsd?.value ?? null
          }
          : null,
        ...dimensionMetrics,

        // we stop showing governance data for now
        controversialProposals: [],
        governanceApis: [],
        // controversialProposals,
        // governanceApis: governanceApis.filter((x) => !!x),
        treasury: treasury?.tokenBreakdowns ?? null,
        yields: projectYields.length > 0
          ? {
            noOfPoolsTracked: projectYields.length,
            averageAPY: projectYields.reduce((acc: any, { apy }: any) => acc + apy, 0) / projectYields.length
          }
          : null,
        helperTexts: {
          fees:
            feesData?.length > 1
              ? 'Sum of all fees from ' +
              (feesData.reduce((acc: any, curr: any) => (acc = [...acc, curr.name]), []) ?? []).join(',')
              : feesData?.[0]?.methodology?.['Fees'] ?? null,
          revenue:
            revenueData?.length > 1
              ? 'Sum of all revenue from ' +
              (revenueData.reduce((acc: any, curr: any) => (acc = [...acc, curr.name]), []) ?? []).join(',')
              : revenueData?.[0]?.methodology?.['Revenue'] ?? null,
          users:
            'This only counts users that interact with protocol directly (so not through another contract, such as a dex aggregator), and only on arbitrum, avax, bsc, ethereum, xdai, optimism, polygon.'
        },
        expenses,
        tokenLiquidity,
        upcomingEvent,
        methodologyUrls: {
          tvl: tvlMethodolodyUrl,
          fees: feesData?.[0]?.methodologyURL ?? null,
          dexs: volumeData?.[0]?.methodologyURL ?? null,
          perps: perpsData?.[0]?.methodologyURL ?? null,
          treasury: protocolData.treasury
            ? `https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/projects/treasury/${protocolData.treasury}`
            : null,
          stablecoins: protocolData.stablecoins
            ? protocolData.stablecoins
              .map(
                (name: any) =>
                  `${name}$https://github.com/DefiLlama/peggedassets-server/blob/master/src/adapters/peggedAssets/${name}/index.ts`
              )
              .join(',')
            : null
        },
        chartDenominations,
        hacksData,
        // clientSide: isCpusHot
      }



      // store data in file, replace # with - in protocol id to get around fragment identifier issue in urls
      await storeRouteData(`/config/smol/protocol-${protocolId}.json`.replace('#', '-'), data)
    }
  }

}

function selectColor(number: any, color: any) {
  const hue = number * 137.508 // use golden angle approximation

  const { h, s, l, a } = colord(color).toHsl()

  return colord({
    h: h + hue,
    s: number !== 0 && l < 70 ? 70 : s,
    l: number !== 0 && l < 60 ? 60 : l,
    a: number !== 0 && a < 0.6 ? 1 : a
  }).toHex()
}

const sluggify = (input: string) => {
  const slug = decodeURIComponent(input)
    .toLowerCase()
    .replace(/[^\w\/]+/g, '-')
  return slug.replace(/^-+/, '').replace(/-+$/, '')
}


// API endpoints
const ACTIVE_USERS_API = 'https://api.llama.fi/activeUsers'
const EMISSIONS_API = 'https://api.llama.fi/emissions'
const PROTOCOLS_EXPENSES_API =
  'https://raw.githubusercontent.com/DefiLlama/defillama-server/master/defi/src/operationalCosts/output/expenses.json'

const NFT_MARKETPLACES_STATS_API = 'https://nft.llama.fi/exchangeStats'
const BRIDGES_API = 'https://bridges.llama.fi/bridges'
const YIELD_POOLS_API = 'https://yields.llama.fi/pools'
const YIELD_CONFIG_API = 'https://api.llama.fi/config/yields'
const CHAINS_ASSETS = 'https://api.llama.fi/chain-assets/chains'
const LIQUIDITY_API = 'https://defillama-datasets.llama.fi/liquidity.json'
const ARTICLES_API = 'https://api.llama.fi/news/articles'
const NFT_MARKETPLACES_VOLUME_API = 'https://nft.llama.fi/exchangeVolume'