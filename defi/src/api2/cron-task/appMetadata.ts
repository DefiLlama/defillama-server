/**
 *
 * Almost all of this code is copied from here:
 * https://github.com/DefiLlama/defillama-app/blob/main/src/api/categories/protocols/getProtocolData.tsx
 */

import { readRouteData, storeRouteData } from "../cache/file-cache";
import * as sdk from "@defillama/sdk";

// import { pullDevMetricsData } from "./githubMetrics";
import { chainNameToIdMap, extraSections } from "../../utils/normalizeChain";
import protocols from "../../protocols/data";
import parentProtocols from "../../protocols/parentProtocols";
import { bridgeCategoriesSet } from "../../utils/excludeProtocols";
import { IChainMetadata, IProtocolMetadata } from "./types";
import { SAFE_HARBOR_PROJECTS_CACHE_KEY } from "../constants";
import { cachedJSONPull, readCachedRouteData } from "../utils/cachedFunctions";
import { runWithRuntimeLogging } from "../utils";
const { exec } = require("child_process");

const allExtraSections = [...extraSections, "doublecounted", "liquidstaking", "dcAndLsOverlap", "excludeParent"];

const protocolInfoMap: any = {};
const parentProtocolsInfoMap: any = {};
const protocolChainSetMap: {
  [key: string]: Set<string>;
} = {};
const protocolsWithGeckoIdSet = new Set<string>();
const tokenlessProtocolsSet = new Set<string>();
const categoriesSet = new Set<string>();
const tagsSet = new Set<string>();
const nameAndIds: any = [];

parentProtocols.forEach((protocol: any) => {
  parentProtocolsInfoMap[protocol.id] = protocol;
  nameAndIds.push(`${protocol.name}+${protocol.id}`);
  protocolChainSetMap[protocol.id] = new Set();
  protocol.childProtocols = [];
  if (protocol.gecko_id) {
    protocolsWithGeckoIdSet.add(protocol.id);
  } else {
    tokenlessProtocolsSet.add(protocol.id);
  }
});

protocols.forEach((protocol: any) => {
  protocolInfoMap[protocol.id] = protocol;
  nameAndIds.push(`${protocol.name}+${protocol.id}`);
  protocolChainSetMap[protocol.id] = new Set();
  if (protocol.category) categoriesSet.add(protocol.category);
  if (protocol.tags) protocol.tags.forEach((tag: string) => tagsSet.add(tag));
  if (protocol.parentProtocol) {
    parentProtocolsInfoMap[protocol.parentProtocol].childProtocols.push(protocol);
  } else {
    if (protocol.gecko_id) {
      protocolsWithGeckoIdSet.add(protocol.id);
    } else {
      tokenlessProtocolsSet.add(protocol.id);
    }
  }
});

const slugMap: any = {
  Binance: "BSC",
};

const slug = (tokenName = "") => {
  try {
    if (!slugMap[tokenName]) slugMap[tokenName] = (tokenName ?? '')?.toLowerCase().split(" ").join("-").split("'").join("");
    return slugMap[tokenName];
  } catch (e: any) {
    const errorMsg = `Error in slug for tokenName=${tokenName}, ${e.message}`;
    console.error(errorMsg);
    return '';
  }
};

export async function storeAppMetadata() {

  console.time("storeAppMetadata");
  console.log("starting to build metadata for front-end");
  try {
    // await pullRaisesDataIfMissing();  // not needed anymore as raises data is always updated before this line is invoked
    // await pullDevMetricsData();  // we no longer use this data
    await _storeAppMetadata();
    
  } catch (e) {
    console.log("Error in storeAppMetadata: ", e);
    console.error(e);
  }
  console.timeEnd("storeAppMetadata");
}

async function pullRaisesDataIfMissing() {
  const raises = await readRouteData("/raises");
  if (!raises) {
    await new Promise((resolve, reject) => {
      exec("npm run cron-raises", (error: any, stdout: any, stderr: any) => {
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
  const finalProtocols: Record<string, IProtocolMetadata> = {};
  const finalChains: Record<string, IChainMetadata> = {};
  let lendingProtocols = 0;

  console.time("_storeMetadataFile fetch all data");
  const [
    tvlData,
    dimensionsChainAggData,
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
    openInterestData,
    aggregatorsData,
    optionsNotionalData,
    optionsPremiumData,
    perpsAggregatorsData,
    bridgeAggregatorsData,
    emmissionsData,
    incentivesData,
    bridgesData,
    chainAssetsData,
    chainsData,
    forksData,
    stablecoinsData,
    oraclesData,
    chainNftsData,
    safeHarborData,
    entitiesData,
    nftStatsData,
  ] = await Promise.all([
    readCachedRouteData({ route: "/lite/protocols2" }),
    readCachedRouteData({ route: "/dimensions/chain-agg-data" }),
    cachedJSONPull({ endpoint: YIELD_POOLS_API, defaultResponse: { data: [] } }).then((res) => res.data ?? []),
    cachedJSONPull({ endpoint: PROTOCOLS_EXPENSES_API, defaultResponse: [] }),
    readCachedRouteData({ route: "/treasuries", defaultResponse: [] }),
    cachedJSONPull({ endpoint: LIQUIDITY_API, defaultResponse: [] }),
    readCachedRouteData({ route: "/hacks", defaultResponse: [] }),
    cachedJSONPull({ endpoint: NFT_MARKETPLACES_STATS_API, defaultResponse: [] }),
    readCachedRouteData({ route: "/raises", defaultResponse: { raises: [] } }),
    cachedJSONPull({ endpoint: ACTIVE_USERS_API, defaultResponse: {} }),
    readCachedRouteData({ route: "/dimensions/fees/df-lite" }),
    readCachedRouteData({ route: "/dimensions/fees/dr-lite" }),
    readCachedRouteData({ route: "/dimensions/fees/dhr-lite" }),
    readCachedRouteData({ route: "/dimensions/fees/dbr-lite" }),
    readCachedRouteData({ route: "/dimensions/fees/dtt-lite" }),
    readCachedRouteData({ route: "/dimensions/dexs/dv-lite" }),
    readCachedRouteData({ route: "/dimensions/derivatives/dv-lite" }),
    readCachedRouteData({ route: "/dimensions/open-interest/doi-lite" }),
    readCachedRouteData({ route: "/dimensions/aggregators/dv-lite" }),
    readCachedRouteData({ route: "/dimensions/options/dnv-lite" }),
    readCachedRouteData({ route: "/dimensions/options/dpv-lite" }),
    readCachedRouteData({ route: "/dimensions/aggregator-derivatives/dv-lite" }),
    readCachedRouteData({ route: "/dimensions/bridge-aggregators/dbv-lite" }),
    cachedJSONPull({ endpoint: `https://defillama-datasets.llama.fi/emissionsProtocolsList`, defaultResponse: [] }),
    cachedJSONPull({ endpoint: `https://defillama-datasets.llama.fi/emissionsBreakdown`, defaultResponse: {} }),
    cachedJSONPull({ endpoint: `${BRIDGES_API}?includeChains=true`, defaultResponse: { chains: [], bridges: [] } }),
    cachedJSONPull({ endpoint: CHAINS_ASSETS, defaultResponse: {} }),
    readCachedRouteData({ route: "/chains", defaultResponse: [] }),
    readCachedRouteData({ route: "/forks", defaultResponse: { forks: {} } }),
    cachedJSONPull({ endpoint: STABLECOINS_API, defaultResponse: { peggedAssets: [], chains: [] } }),
    readCachedRouteData({ route: "/oracles", defaultResponse: { oracles: {} } }),
    cachedJSONPull({ endpoint: CHAIN_NFTS, defaultResponse: {} }),
    sdk.cache.readCache(SAFE_HARBOR_PROJECTS_CACHE_KEY, { readFromR2Cache: true }).catch(() => ({})),
    cachedJSONPull({ endpoint: "https://api.llama.fi/entities", defaultResponse: [] }),
    getNftStats(),
  ]);

  console.timeEnd("_storeMetadataFile fetch all data");

  await _storeMetadataFile();
  await storeRouteData("/_fe/static/safe-harbor-projects", safeHarborData);

  async function _storeMetadataFile() {
    for (const chain of tvlData.chains) {
      finalChains[slug(chain)] = { name: chain, id: chain };
    }

    const parentToChildProtocols: any = {};
    for (const protocol of tvlData.protocols) {
      const protocolInfo = protocolInfoMap[protocol.defillamaId];
      if (!protocolInfo) {
        console.warn(`Protocol ${protocol.defillamaId} not found in protocolInfoMap`);
        continue;
      }
      const slugName: string = slug(protocol.name);
      finalProtocols[protocol.defillamaId] = {
        name: slugName,
        tvl: protocol.tvl != null && protocolInfo.module != null && protocolInfo.module !== "dummy.js" ? true : false,
        yields: yieldsData.find((pool: any) => pool.project === slugName) ? true : false,
        ...(protocol.governanceID ? { governance: true } : {}),
        ...(forksData.forks[protocol.name] ? { forks: true } : {}),
        ...(bridgeCategoriesSet.has(protocol.category) ? { bridge: true } : {}),
      };

      if (protocol.parentProtocol) {
        parentToChildProtocols[protocol.parentProtocol] = [
          ...(parentToChildProtocols[protocol.parentProtocol] ?? []),
          slugName,
        ];
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          ...(protocol.tvl != null ? { tvl: true } : {}),
        };
      }

      if (protocol.category === "Lending") {
        lendingProtocols += 1;
      }

      const chainTvls = Object.entries(protocol.chainTvls ?? {})
        .map((p: any) => [p[0], p[1]?.tvl ?? 0])
        .sort((a: any, b: any) => b[1] - a[1]);
      for (const [chain] of chainTvls) {
        if (chain.includes("-") || allExtraSections.includes(chain)) continue;
        protocolChainSetMap[protocol.defillamaId].add(chain);
      }
    }
    for (const protocol of tvlData.parentProtocols) {
      const { name: _, ...rest } = finalProtocols[protocol.id];
      const slugName: string = slug(protocol.name);
      finalProtocols[protocol.id] = {
        name: slugName,
        yields: yieldsData.find(
          (pool: any) => pool.project === slugName || parentToChildProtocols[protocol.id]?.includes(pool.project)
        )
          ? true
          : false,
        ...rest,
        ...(protocol.governanceID ? { governance: true } : {}),
        ...(forksData.forks[protocol.name] ? { forks: true } : {}),
      };
    }

    for (const protocol in protocolInfoMap) {
      if (protocolInfoMap[protocol].stablecoins?.length) {
        finalProtocols[protocol] = {
          ...finalProtocols[protocol],
          stablecoins: true,
        };
      }
    }

    for (const protocol in parentProtocolsInfoMap) {
      if (parentProtocolsInfoMap[protocol].stablecoins?.length) {
        finalProtocols[protocol] = {
          ...finalProtocols[protocol],
          stablecoins: true,
        };
      }
    }

    for (const protocol of expensesData) {
      finalProtocols[protocol.protocolId] = {
        ...finalProtocols[protocol.protocolId],
        expenses: true,
      };
    }

    for (const protocol of treasuryData) {
      finalProtocols[protocol.id.split("-treasury")[0]] = {
        ...finalProtocols[protocol.id.split("-treasury")[0]],
        treasury: true,
      };
    }

    for (const protocol of liquidityData) {
      finalProtocols[protocol.id] = {
        ...finalProtocols[protocol.id],
        liquidity: true,
      };
    }

    for (const protocol of hacksData) {
      if (protocol.defillamaId) {
        finalProtocols[protocol.defillamaId.toString()] = {
          ...finalProtocols[protocol.defillamaId.toString()],
          hacks: true,
        };
      }
    }

    for (const raise of raisesData.raises) {
      if (raise.defillamaId && !raise.defillamaId.startsWith("chain")) {
        finalProtocols[raise.defillamaId] = {
          ...finalProtocols[raise.defillamaId],
          raises: true,
        };
      }
    }

    for (const protocol in activeUsersData) {
      if (protocol.startsWith("chain")) {
        const chain = Object.keys(finalChains).find((chain) => protocol === `chain#${chain.toLowerCase()}`);
        if (chain) {
          finalChains[slug(chain)] = {
            ...(finalChains[slug(chain)] ?? { name: chain }),
            activeUsers: true,
          };
        }
      } else {
        finalProtocols[protocol] = {
          ...finalProtocols[protocol],
          activeUsers: true,
        };
      }
    }

    for (const protocol of feesData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        fees: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          fees: true,
        };
      }

      if (protocolChainSetMap[protocol.defillamaId]) {
        for (const chain of protocol.chains ?? []) {
          protocolChainSetMap[protocol.defillamaId].add(chain);
        }
      }
    }

    for (const protocol of feeBribeRevenueData.protocols) {
      if (!protocol.totalAllTime && protocol.totalAllTime !== 0) continue; // skip if this totalAllTime field is missing

      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        bribeRevenue: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          bribeRevenue: true,
        };
      }

      if (protocolChainSetMap[protocol.defillamaId]) {
        for (const chain of protocol.chains ?? []) {
          protocolChainSetMap[protocol.defillamaId].add(chain);
        }
      }
    }

    for (const protocol of feeTokenTaxData.protocols) {
      if (!protocol.totalAllTime && protocol.totalAllTime !== 0) continue; // skip if this totalAllTime field is missing

      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        tokenTax: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          tokenTax: true,
        };
      }

      if (protocolChainSetMap[protocol.defillamaId]) {
        for (const chain of protocol.chains ?? []) {
          protocolChainSetMap[protocol.defillamaId].add(chain);
        }
      }
    }

    for (const chain of feesData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        fees: true,
      };
    }

    const chainsWithFees = feesData.protocols
      .filter((i: any) => i.defillamaId.startsWith("chain#"))
      .map((i: any) => i.name);
    for (const chain of chainsWithFees) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        chainFees: true,
      };
    }

    for (const protocol of revenueData.protocols) {
      if (!protocol.totalAllTime && protocol.totalAllTime !== 0) continue; // skip if this totalAllTime field is missing

      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        revenue: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          revenue: true,
        };
      }

      if (protocolChainSetMap[protocol.defillamaId]) {
        for (const chain of protocol.chains ?? []) {
          protocolChainSetMap[protocol.defillamaId].add(chain);
        }
      }
    }

    for (const chain of revenueData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        revenue: true,
      };
    }

    const chainsWithRevenue = revenueData.protocols
      .filter((i: any) => i.defillamaId.startsWith("chain#"))
      .map((i: any) => i.name);
    for (const chain of chainsWithRevenue) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        chainRevenue: true,
      };
    }

    for (const protocol of holdersRevenueData.protocols) {
      if (!protocol.totalAllTime && protocol.totalAllTime !== 0) continue; // skip if this totalAllTime field is missing

      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        holdersRevenue: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          holdersRevenue: true,
        };
      }

      if (protocolChainSetMap[protocol.defillamaId]) {
        for (const chain of protocol.chains ?? []) {
          protocolChainSetMap[protocol.defillamaId].add(chain);
        }
      }
    }

    for (const protocol of volumeData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        dexs: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          dexs: true,
        };
      }

      if (protocolChainSetMap[protocol.defillamaId]) {
        for (const chain of protocol.chains ?? []) {
          protocolChainSetMap[protocol.defillamaId].add(chain);
        }
      }
    }
    for (const chain of volumeData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        dexs: true,
      };
    }

    for (const protocol of perpsData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        perps: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          perps: true,
        };
      }

      if (protocolChainSetMap[protocol.defillamaId]) {
        for (const chain of protocol.chains ?? []) {
          protocolChainSetMap[protocol.defillamaId].add(chain);
        }
      }
    }
    for (const chain of perpsData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        perps: true,
      };
    }

    for (const protocol of openInterestData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        openInterest: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          openInterest: true,
        };
      }

      if (protocolChainSetMap[protocol.defillamaId]) {
        for (const chain of protocol.chains ?? []) {
          protocolChainSetMap[protocol.defillamaId].add(chain);
        }
      }
    }
    for (const chain of openInterestData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        openInterest: true,
      };
    }

    for (const protocol of aggregatorsData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        dexAggregators: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          dexAggregators: true,
        };
      }

      if (protocolChainSetMap[protocol.defillamaId]) {
        for (const chain of protocol.chains ?? []) {
          protocolChainSetMap[protocol.defillamaId].add(chain);
        }
      }
    }
    for (const chain of aggregatorsData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        dexAggregators: true,
      };
    }

    for (const protocol of optionsPremiumData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        optionsPremiumVolume: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          optionsPremiumVolume: true,
        };
      }

      if (protocolChainSetMap[protocol.defillamaId]) {
        for (const chain of protocol.chains ?? []) {
          protocolChainSetMap[protocol.defillamaId].add(chain);
        }
      }
    }
    for (const chain of optionsPremiumData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        optionsPremiumVolume: true,
      };
    }

    for (const protocol of optionsNotionalData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        optionsNotionalVolume: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          optionsNotionalVolume: true,
        };
      }

      if (protocolChainSetMap[protocol.defillamaId]) {
        for (const chain of protocol.chains ?? []) {
          protocolChainSetMap[protocol.defillamaId].add(chain);
        }
      }
    }
    for (const chain of optionsNotionalData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        optionsNotionalVolume: true,
      };
    }

    for (const protocol of perpsAggregatorsData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        perpsAggregators: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          perpsAggregators: true,
        };
      }

      if (protocolChainSetMap[protocol.defillamaId]) {
        for (const chain of protocol.chains ?? []) {
          protocolChainSetMap[protocol.defillamaId].add(chain);
        }
      }
    }
    for (const chain of perpsAggregatorsData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        perpsAggregators: true,
      };
    }

    for (const protocol of bridgeAggregatorsData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        bridgeAggregators: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          bridgeAggregators: true,
        };
      }

      if (protocolChainSetMap[protocol.defillamaId]) {
        for (const chain of protocol.chains ?? []) {
          protocolChainSetMap[protocol.defillamaId].add(chain);
        }
      }
    }
    for (const chain of bridgeAggregatorsData.allChains ?? []) {
      finalChains[slug(chain)] = {
        ...(finalChains[slug(chain)] ?? { name: chain }),
        bridgeAggregators: true,
      };
    }

    const bridges = new Set(bridgesData.bridges.map((b: any) => b.displayName));
    const allNftMarketplaces = new Set(nftMarketplacesData.map((market: any) => market.exchangeName));
    const allEmissionsProtocols = new Set(emmissionsData);
    for (const protocolNameAndId of nameAndIds) {
      const [protocolName, protocolId] = protocolNameAndId.split("+");
      if (allEmissionsProtocols.has(slug(protocolName))) {
        finalProtocols[protocolId] = {
          ...finalProtocols[protocolId],
          emissions: true,
        };
      }

      if (incentivesData?.[slug(protocolName)]) {
        finalProtocols[protocolId] = {
          ...finalProtocols[protocolId],
          incentives: true,
        };
      }

      if (bridges.has(protocolName)) {
        finalProtocols[protocolId] = {
          ...finalProtocols[protocolId],
          bridge: true,
        };
      }

      if (allNftMarketplaces.has(protocolName)) {
        finalProtocols[protocolId] = {
          ...finalProtocols[protocolId],
          nfts: true,
        };
      }
    }

    const chainProtocolCount: any = {};
    const sortedProtocolData = Object.keys(finalProtocols)
      .sort()
      .reduce((r: any, k) => {
        r[k] = finalProtocols[k];
        if (protocolInfoMap[k]) {
          r[k].displayName = protocolInfoMap[k].name;
          r[k].chains = protocolChainSetMap[k] ? Array.from(protocolChainSetMap[k]) : [];

          r[k].chains.forEach((chain: any) => {
            chainProtocolCount[chain] = (chainProtocolCount[chain] || 0) + 1;
          });

          // if protocol has signed safe harbor agreement
          if (safeHarborData?.[k]) r[k].safeHarbor = true;
        }
        if (parentProtocolsInfoMap[k]) {
          r[k].displayName = parentProtocolsInfoMap[k].name;
          const chainSet = new Set();
          parentProtocolsInfoMap[k].childProtocols?.forEach((p: any) => {
            const chains = protocolChainSetMap[p.id] ? Array.from(protocolChainSetMap[p.id]) : [];
            chains.forEach((chain: any) => chainSet.add(chain));
          });
          r[k].chains = Array.from(chainSet);

          // if protocol has signed safe harbor agreement
          if (safeHarborData?.[k]) r[k].safeHarbor = true;
        }
        return r;
      }, {});

    await storeRouteData("/config/smol/appMetadata-protocols.json", sortedProtocolData);

    for (const chain of bridgesData.chains) {
      if (finalChains[slug(chain.name)]) {
        finalChains[slug(chain.name)] = { ...(finalChains[slug(chain.name)] ?? { name: chain.name }), inflows: true };
      }
    }

    for (const chain in chainAssetsData) {
      if (finalChains[slug(chain)]) {
        finalChains[slug(chain)] = { ...(finalChains[slug(chain)] ?? { name: chain }), chainAssets: true };
      }
    }

    for (let chain of stablecoinsData.chains) {
      chain = chain.name
      if (finalChains[slug(chain)]) {
        finalChains[slug(chain)] = { ...(finalChains[slug(chain)] ?? { name: chain }), stablecoins: true };
      }
    }

    for (const chain of chainsData) {
      if (finalChains[slug(chain.name)] && chain.gecko_id) {
        finalChains[slug(chain.name)] = {
          ...(finalChains[slug(chain.name)] ?? { name: chain.name }),
          gecko_id: chain.gecko_id,
          tokenSymbol: chain.tokenSymbol,
          ...(incentivesData?.[slug(chain.name)] ? { incentives: true } : {}),
        };
      }
    }

    Object.keys(finalChains).forEach((chain) => {
      finalChains[chain].dimAgg = dimensionsChainAggData[chain] ?? {};
    });

    const sortedChainData = Object.keys(finalChains)
      .sort()
      .reduce((r: any, k) => ((r[k] = finalChains[k]), r), {});

    for (const _chain of Object.values(sortedChainData)) {
      const chain = _chain as any;
      chain.id = chainNameToIdMap[chain.name] ?? slug(chain.name);
      if (!chainNameToIdMap[chain.name])
        console.log(`Chain ${chain.name} does not have an id. using ${slug(chain.name)}`);
      chain.protocolCount = chainProtocolCount[chain.name] ?? 0;
    }

    await storeRouteData("/config/smol/appMetadata-chains.json", sortedChainData);

    const investors = new Set(
      raisesData.raises
        .flatMap((raise: any) => raise.leadInvestors)
        .concat(raisesData.raises.flatMap((raise: any) => raise.otherInvestors))
    );

    const totalTrackedByMetric = {
      tvl: { protocols: 0, chains: 0 },
      stablecoins: { protocols: stablecoinsData.peggedAssets.length, chains: stablecoinsData.chains.length },
      fees: { protocols: 0, chains: 0 },
      revenue: { protocols: 0, chains: 0 },
      chainFees: { protocols: 0, chains: 0 },
      chainRevenue: { protocols: 0, chains: 0 },
      holdersRevenue: { protocols: 0, chains: 0 },
      dexs: { protocols: 0, chains: 0 },
      dexAggregators: { protocols: 0, chains: 0 },
      perps: { protocols: 0, chains: 0 },
      openInterest: { protocols: 0, chains: 0 },
      perpAggregators: { protocols: 0, chains: 0 },
      optionsPremiumVolume: { protocols: 0, chains: 0 },
      optionsNotionalVolume: { protocols: 0, chains: 0 },
      bridgeAggregators: { protocols: 0, chains: 0 },
      lending: { protocols: lendingProtocols, chains: 0 },
      treasury: { protocols: 0, chains: 0, entities: entitiesData.length },
      emissions: { protocols: 0, chains: 0 },
      incentives: { protocols: 0, chains: 0 },
      forks: { protocols: 0, chains: 0 },
      oracles: { protocols: 0, chains: 0 },
      cexs: { protocols: 0, chains: 0 },
      bridgedTVL: { protocols: 0, chains: 0 },
      nfts: { ...nftStatsData, protocols: 0, chains: 0 },
      yields: { protocols: 0, chains: 0, pools: yieldsData.length },
      bridges: { protocols: bridgesData.bridges.length, chains: bridgesData.chains.length },
      raises: { total: raisesData.raises.length, investors: investors.size },
      safeHarbor: { protocols: 0, chains: 0 },
      hacks: { total: hacksData.length, protocols: 0, chains: 0 },
      categories: categoriesSet.size,
      tags: tagsSet.size,
      protocolsWithGeckoId: protocolsWithGeckoIdSet.size,
      tokenlessProtocols: tokenlessProtocolsSet.size,
      pf: { protocols: 0, chains: 0 },
      ps: { protocols: 0, chains: 0 },
      expenses: { protocols: 0, chains: 0 },
      governance: { protocols: 0, chains: 0 },
    };

    for (const p in sortedProtocolData) {
      if (p.startsWith("parent#")) continue;
      const protocol = sortedProtocolData[p];
      if (protocol.tvl) {
        totalTrackedByMetric.tvl.protocols += 1;
      }
      if (protocol.fees) {
        totalTrackedByMetric.fees.protocols += 1;
        if (protocolsWithGeckoIdSet.has(p)) {
          totalTrackedByMetric.pf.protocols += 1;
        }
      }
      if (protocol.revenue) {
        totalTrackedByMetric.revenue.protocols += 1;
        if (protocolsWithGeckoIdSet.has(p)) {
          totalTrackedByMetric.ps.protocols += 1;
        }
      }
      if (protocol.holdersRevenue) {
        totalTrackedByMetric.holdersRevenue.protocols += 1;
      }
      if (protocol.dexs) {
        totalTrackedByMetric.dexs.protocols += 1;
      }
      if (protocol.dexAggregators) {
        totalTrackedByMetric.dexAggregators.protocols += 1;
      }
      if (protocol.perps) {
        totalTrackedByMetric.perps.protocols += 1;
      }
      if (protocol.openInterest) {
        totalTrackedByMetric.openInterest.protocols += 1;
      }
      if (protocol.perpsAggregators) {
        totalTrackedByMetric.perpAggregators.protocols += 1;
      }
      if (protocol.optionsPremiumVolume) {
        totalTrackedByMetric.optionsPremiumVolume.protocols += 1;
      }
      if (protocol.optionsNotionalVolume) {
        totalTrackedByMetric.optionsNotionalVolume.protocols += 1;
      }
      if (protocol.bridgeAggregators) {
        totalTrackedByMetric.bridgeAggregators.protocols += 1;
      }
      if (protocol.emissions) {
        totalTrackedByMetric.emissions.protocols += 1;
      }
      if (protocol.incentives) {
        totalTrackedByMetric.incentives.protocols += 1;
      }
      if (protocol.treasury) {
        totalTrackedByMetric.treasury.protocols += 1;
      }
      if (protocol.forks) {
        totalTrackedByMetric.forks.protocols += 1;
      }
      if (protocol.nfts) {
        totalTrackedByMetric.nfts.protocols += 1;
      }
      if (protocol.yields) {
        totalTrackedByMetric.yields.protocols += 1;
      }
      if (protocol.safeHarbor) {
        totalTrackedByMetric.safeHarbor.protocols += 1;
      }
      if (protocol.hacks) {
        totalTrackedByMetric.hacks.protocols += 1;
      }
      if (protocol.expenses) {
        totalTrackedByMetric.expenses.protocols += 1;
      }
      if (protocol.governance) {
        totalTrackedByMetric.governance.protocols += 1;
      }
    }

    for (const oracle in oraclesData?.oracles ?? []) {
      totalTrackedByMetric.oracles.protocols += 1;
    }

    for (const pc in sortedChainData) {
      const chain = sortedChainData[pc];

      totalTrackedByMetric.tvl.chains += 1;

      if (chain.stablecoins) {
        totalTrackedByMetric.stablecoins.chains += 1;
      }
      if (chain.fees) {
        totalTrackedByMetric.fees.chains += 1;

        totalTrackedByMetric.pf.chains += 1;
      }
      if (chain.revenue) {
        totalTrackedByMetric.revenue.chains += 1;
        totalTrackedByMetric.ps.chains += 1;
      }
      if (chain.chainFees) {
        totalTrackedByMetric.chainFees.chains += 1;
      }
      if (chain.chainRevenue) {
        totalTrackedByMetric.chainRevenue.chains += 1;
      }
      if (chain.dexs) {
        totalTrackedByMetric.dexs.chains += 1;
      }
      if (chain.dexAggregators) {
        totalTrackedByMetric.dexAggregators.chains += 1;
      }
      if (chain.perps) {
        totalTrackedByMetric.perps.chains += 1;
      }
      if (chain.openInterest) {
        totalTrackedByMetric.openInterest.chains += 1;
      }
      if (chain.perpsAggregators) {
        totalTrackedByMetric.perpAggregators.chains += 1;
      }
      if (chain.optionsPremiumVolume) {
        totalTrackedByMetric.optionsPremiumVolume.chains += 1;
      }
      if (chain.optionsNotionalVolume) {
        totalTrackedByMetric.optionsNotionalVolume.chains += 1;
      }
      if (chain.bridgeAggregators) {
        totalTrackedByMetric.bridgeAggregators.chains += 1;
      }
      if (chain.chainAssets) {
        totalTrackedByMetric.bridgedTVL.chains += 1;
      }
      if (chain.incentives) {
        totalTrackedByMetric.incentives.chains += 1;
      }
    }

    totalTrackedByMetric.nfts.chains += Object.keys(chainNftsData).length;

    for (const protocol in protocolInfoMap) {
      if (protocolInfoMap[protocol].category === "CEX") {
        totalTrackedByMetric.cexs.protocols += 1;
      }
    }

    await storeRouteData("/config/smol/appMetadata-totalTrackedByMetric.json", totalTrackedByMetric);

    await storeRouteData("/config/smol/appMetadata-categoriesAndTags.json", {
      categories: Array.from(categoriesSet),
      tags: Array.from(tagsSet),
    });

    console.log("finished building metadata");
  }
}

// API endpoints
const ACTIVE_USERS_API = "https://api.llama.fi/activeUsers";
const PROTOCOLS_EXPENSES_API =
  "https://raw.githubusercontent.com/DefiLlama/defillama-server/master/defi/src/operationalCosts/output/expenses.json";

const NFT_MARKETPLACES_STATS_API = "https://nft.llama.fi/exchangeStats";
const BRIDGES_API = "https://bridges.llama.fi/bridges";
const YIELD_POOLS_API = "https://yields.llama.fi/pools";
const CHAINS_ASSETS = "https://api.llama.fi/chain-assets/chains";
const LIQUIDITY_API = "https://defillama-datasets.llama.fi/liquidity.json";
const CHAIN_NFTS = "https://defillama-datasets.llama.fi/temp/chainNfts";
const STABLECOINS_API = "https://stablecoins.llama.fi/stablecoins";

async function getNftStats() {
  const [collections, marketplaces, chains] = await Promise.all([
    cachedJSONPull({ endpoint: "https://nft.llama.fi/collections", defaultResponse: [] })
      .then((res) => res.length),
    cachedJSONPull({ endpoint: "https://nft.llama.fi/exchangeStats", defaultResponse: [] })
      .then((res) => res.length),
    // cachedJSONPull({ endpoint: "https://nft.llama.fi/mints", defaultResponse: [] })
    //   .then((res) => res.length),  // this route doesnt work, plus we were reading only three items in the .all response
    cachedJSONPull({ endpoint: CHAIN_NFTS })
      .then((res) => Object.keys(res).length),
  ]);
  return {
    collections,
    marketplaces,
    chains,
  };
}

runWithRuntimeLogging(storeAppMetadata, {
  application: 'cron-task',
  type: 'app-metadata',
}).catch(console.error).then(() => process.exit(0))

setTimeout(() => {
  console.log('Running for more than 5 minutes, exiting.');
  process.exit(1);
}, 5 * 60 * 1000) // keep process alive for 5 minutes in case of hanging promises

