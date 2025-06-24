/**
 * 
 * Almost all of this code is copied from here: 
 * https://github.com/DefiLlama/defillama-app/blob/main/src/api/categories/protocols/getProtocolData.tsx
 */


import { getMetadataAll, readRouteData, storeRouteData } from '../cache/file-cache'
import { cache } from '@defillama/sdk'

import fetch from "node-fetch";
import { pullDevMetricsData } from './githubMetrics';
import { chainCoingeckoIds, chainNameToIdMap } from '../../utils/normalizeChain';
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
  protocol.childProtocols = []
})

protocols.forEach((protocol: any) => {
  protocolInfoMap[protocol.id] = protocol
  protocolChainSetMap[protocol.id] = new Set(protocol.chains ?? [])
  if (protocol.parentProtocol) {
    parentProtocolsInfoMap[protocol.parentProtocol].childProtocols.push(protocol)
  }
})


const fetchJson = async (url: string) => fetch(url).then(res => res.json())
const slugMap: any = {
  'Binance': 'bsc',
}

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
    holdersRevenueData,
    feeBribeRevenueData,
    feeTokenTaxData,
    volumeData,
    perpsData,
    aggregatorsData,
    optionsNotionalData,
    optionsPremiumData,
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
    readRouteData('/dimensions/fees/dhr-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/fees/dbr-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/fees/dtt-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/dexs/dv-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/derivatives/dv-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/aggregators/dv-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/options/dnv-lite').catch(() => ({ protocols: {} })),
    readRouteData('/dimensions/options/dpv-lite').catch(() => ({ protocols: {} })),
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
        allTimeRevenue: 'totalAllTime',
      }
    },
    {
      mapKey: 'holdersRevenue', data: holdersRevenueData, finalDataKeys: {
        dailyHoldersRevenue: 'total24h',
        holdersRevenue30d: 'total30d',
        allTimeHoldersRevenue: 'totalAllTime',
      }
    },
    {
      mapKey: 'bribe', data: feeBribeRevenueData, finalDataKeys: {
        dailyBribesRevenue: 'total24h',
        bribesRevenue30d: 'total30d',
        allTimeBribesRevenue: 'totalAllTime',
      }
    },
    {
      mapKey: 'tokenTax', data: feeTokenTaxData, finalDataKeys: {
        dailyTokenTaxes: 'total24h',
        tokenTaxesRevenue30d: 'total30d',
        allTimeTokenTaxes: 'totalAllTime',
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
      mapKey: 'options', data: optionsPremiumData, finalDataKeys: {
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
      let id = protocol.id ?? protocol.defillamaId
      if (id && protocol.chains?.length) {
        if (!protocolChainSetMap[id]) protocolChainSetMap[id] = new Set([])
        protocol.chains.forEach((chain: any) => {
          protocolChainSetMap[id].add(chain)
        })
      }

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
        if (pData.chains?.length) {
          if (!protocolChainSetMap[id]) protocolChainSetMap[id] = new Set([])
          pData.chains.forEach((chain: any) => {
            protocolChainSetMap[id].add(chain)
          })
        }

        if (!pData.hasOwnProperty('total24h')) return; // skip if this total24h field is missing
        if (pData.id) dataMap[pData.id] = pData
        if (pData.defillamaId) dataMap[pData.defillamaId] = pData
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
        tvl: protocol.tvl != null ? true : false,
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

    for (const protocol of feeBribeRevenueData.protocols) {
      if (!protocol.totalAllTime && protocol.totalAllTime !== 0) continue; // skip if this totalAllTime field is missing

      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        bribeRevenue: true
      }

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          bribeRevenue: true
        }
      }
    }

    for (const protocol of feeTokenTaxData.protocols) {
      if (!protocol.totalAllTime && protocol.totalAllTime !== 0) continue; // skip if this totalAllTime field is missing

      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        tokenTax: true
      }

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          tokenTax: true
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
      if (!protocol.totalAllTime && protocol.totalAllTime !== 0) continue; // skip if this totalAllTime field is missing

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

    for (const protocol of holdersRevenueData.protocols) {
      if (!protocol.totalAllTime && protocol.totalAllTime !== 0) continue; // skip if this totalAllTime field is missing

      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        holdersRevenue: true
      }

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          holdersRevenue: true
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

    for (const protocol of optionsPremiumData.protocols) {
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
    for (const chain of optionsPremiumData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        options: true
      }
    }


    for (const protocol of optionsNotionalData.protocols) {
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
    for (const chain of optionsNotionalData.allChains ?? []) {
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
          r[k].chains = protocolChainSetMap[k] ? Array.from(protocolChainSetMap[k]) : []
        }
        if (parentProtocolsInfoMap[k]) {
          r[k].displayName = parentProtocolsInfoMap[k].name
          const chainSet = new Set()
          parentProtocolsInfoMap[k].childProtocols?.forEach((p: any) => {
            const chains = protocolChainSetMap[p.id] ? Array.from(protocolChainSetMap[p.id]) : []
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

    for (const _chain of Object.values(sortedChainData)) {
      const chain = _chain as any
      chain.id = chainNameToIdMap[chain.name] ?? slug(chain.name)
      if (!chainNameToIdMap[chain.name]) console.log(`Chain ${chain.name} does not have an id. using ${slug(chain.name)}`,)
    }

    await storeRouteData('/config/smol/appMetadata-chains.json', sortedChainData)
    console.log('finished building metadata')
  }
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
