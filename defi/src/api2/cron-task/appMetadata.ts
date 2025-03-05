import { readRouteData, storeRouteData } from '../cache/file-cache'

import fetch from "node-fetch";
const { exec } = require('child_process');

const fetchJson = async (url: string) => fetch(url).then(res => res.json())

const slug = (tokenName = '') => tokenName?.toLowerCase().split(' ').join('-').split("'").join('')

export async function storeAppMetadata() {
  console.log('starting to build metadata for front-end')
  try {
    await pullRaisesDataIfMissing()
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
    forksData
  ] = await Promise.all([
    readRouteData('/lite/protocols2'),
    fetchJson(YIELD_POOLS_API).then((res) => res.data ?? []),
    fetchJson(PROTOCOLS_EXPENSES_API),
    readRouteData('/treasuries'),
    fetchJson(LIQUIDITY_API),
    readRouteData('/hacks'),
    fetchJson(NFT_MARKETPLACES_STATS_API),
    readRouteData('/raises'),
    fetchJson(ACTIVE_USERS_API).catch(() => ({})),
    readRouteData('/dimensions/fees/df-lite'),
    readRouteData('/dimensions/fees/dr-lite'),
    readRouteData('/dimensions/dexs/dv-lite'),
    readRouteData('/dimensions/derivatives/dv-lite'),
    readRouteData('/dimensions/aggregators/dv-lite'),
    readRouteData('/dimensions/options/dnv-lite'),
    readRouteData('/dimensions/aggregator-derivatives/dv-lite'),
    readRouteData('/dimensions/bridge-aggregators/dbv-lite'),
    fetchJson(`https://defillama-datasets.llama.fi/emissionsProtocolsList`),
    fetchJson(`${BRIDGES_API}?includeChains=true`),
    fetchJson(CHAINS_ASSETS),
    readRouteData('/chains'),
    readRouteData('/forks'),
  ])

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
    .reduce((r: any, k) => ((r[k] = finalProtocols[k]), r), {})

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

// API endpoints
const ACTIVE_USERS_API = 'https://api.llama.fi/activeUsers'
const PROTOCOLS_EXPENSES_API =
  'https://raw.githubusercontent.com/DefiLlama/defillama-server/master/defi/src/operationalCosts/output/expenses.json'

const NFT_MARKETPLACES_STATS_API = 'https://nft.llama.fi/exchangeStats'
const BRIDGES_API = 'https://bridges.llama.fi/bridges'
const YIELD_POOLS_API = 'https://yields.llama.fi/pools'
const CHAINS_ASSETS = 'https://api.llama.fi/chain-assets/chains'
const LIQUIDITY_API = 'https://defillama-datasets.llama.fi/liquidity.json'
