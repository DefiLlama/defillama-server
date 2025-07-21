/**
 *
 * Almost all of this code is copied from here:
 * https://github.com/DefiLlama/defillama-app/blob/main/src/api/categories/protocols/getProtocolData.tsx
 */

import { readRouteData, storeRouteData } from "../cache/file-cache";

import fetch from "node-fetch";
import { pullDevMetricsData } from "./githubMetrics";
import { chainNameToIdMap, extraSections } from "../../utils/normalizeChain";
import protocols from "../../protocols/data";
import parentProtocols from "../../protocols/parentProtocols";
const { exec } = require("child_process");

const allExtraSections = [...extraSections, "doublecounted", "liquidstaking", "dcAndLsOverlap"];

const protocolInfoMap: any = {};
const parentProtocolsInfoMap: any = {};
const protocolChainSetMap: {
  [key: string]: Set<string>;
} = {};
const nameAndIds: any = [];

parentProtocols.forEach((protocol: any) => {
  parentProtocolsInfoMap[protocol.id] = protocol;
  nameAndIds.push(`${protocol.name}+${protocol.id}`);
  protocolChainSetMap[protocol.id] = new Set();
  protocol.childProtocols = [];
});

protocols.forEach((protocol: any) => {
  protocolInfoMap[protocol.id] = protocol;
  nameAndIds.push(`${protocol.name}+${protocol.id}`);
  protocolChainSetMap[protocol.id] = new Set();
  if (protocol.parentProtocol) {
    parentProtocolsInfoMap[protocol.parentProtocol].childProtocols.push(protocol);
  }
});

const fetchJson = async (url: string) => fetch(url).then((res) => res.json());
const slugMap: any = {
  Binance: "BSC",
};

const slug = (tokenName = "") => {
  if (!slugMap[tokenName]) slugMap[tokenName] = tokenName?.toLowerCase().split(" ").join("-").split("'").join("");
  return slugMap[tokenName]
};

export async function storeAppMetadata() {
  console.log("starting to build metadata for front-end");
  try {
    await pullRaisesDataIfMissing();
    await pullDevMetricsData();
    await _storeAppMetadata();
  } catch (e) {
    console.log("Error in storeAppMetadata: ", e);
    console.error(e);
  }
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
  const finalProtocols: any = {};
  const finalChains: any = {};
  let lendingProtocols = 0;

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
    stablecoinsTracked,
    oraclesData,
    chainNftsData,
  ] = await Promise.all([
    readRouteData("/lite/protocols2"),
    fetchJson(YIELD_POOLS_API).then((res) => res.data ?? []),
    fetchJson(PROTOCOLS_EXPENSES_API).catch(() => []),
    readRouteData("/treasuries").catch(() => []),
    fetchJson(LIQUIDITY_API).catch(() => []),
    readRouteData("/hacks").catch(() => []),
    fetchJson(NFT_MARKETPLACES_STATS_API).catch(() => []),
    readRouteData("/raises").catch(() => ({ raises: [] })),
    fetchJson(ACTIVE_USERS_API).catch(() => ({})),
    readRouteData("/dimensions/fees/df-lite").catch(() => ({ protocols: {} })),
    readRouteData("/dimensions/fees/dr-lite").catch(() => ({ protocols: {} })),
    readRouteData("/dimensions/fees/dhr-lite").catch(() => ({ protocols: {} })),
    readRouteData("/dimensions/fees/dbr-lite").catch(() => ({ protocols: {} })),
    readRouteData("/dimensions/fees/dtt-lite").catch(() => ({ protocols: {} })),
    readRouteData("/dimensions/dexs/dv-lite").catch(() => ({ protocols: {} })),
    readRouteData("/dimensions/derivatives/dv-lite").catch(() => ({ protocols: {} })),
    readRouteData("/dimensions/aggregators/dv-lite").catch(() => ({ protocols: {} })),
    readRouteData("/dimensions/options/dnv-lite").catch(() => ({ protocols: {} })),
    readRouteData("/dimensions/options/dpv-lite").catch(() => ({ protocols: {} })),
    readRouteData("/dimensions/aggregator-derivatives/dv-lite").catch(() => ({ protocols: {} })),
    readRouteData("/dimensions/bridge-aggregators/dbv-lite").catch(() => ({ protocols: {} })),
    fetchJson(`https://defillama-datasets.llama.fi/emissionsProtocolsList`).catch(() => []),
    fetchJson(`${BRIDGES_API}?includeChains=true`).catch(() => ({ chains: [] })),
    fetchJson(CHAINS_ASSETS).catch(() => ({})),
    readRouteData("/chains").catch(() => []),
    readRouteData("/forks").catch(() => ({ forks: {} })),
    fetchJson(STABLECOINS_API)
      .then((res) => ({ protocols: res.peggedAssets.length, chains: res.chains.length }))
      .catch(() => ({ protocols: 0, chains: 0 })),
    readRouteData("/oracles").catch(() => ({ oracles: {} })),
    fetchJson(CHAIN_NFTS).catch(() => ({})),
  ]);

  await _storeMetadataFile();

  async function _storeMetadataFile() {
    for (const chain of tvlData.chains) {
      finalChains[slug(chain)] = { name: chain };
    }


    const parentToChildProtocols: any = {};
    for (const protocol of tvlData.protocols) {
      const name = slug(protocol.name);
      finalProtocols[protocol.defillamaId] = {
        name,
        tvl: protocol.tvl != null ? true : false,
        yields: yieldsData.find((pool: any) => pool.project === name) ? true : false,
        ...(protocol.governanceID ? { governance: true } : {}),
        ...(forksData.forks[protocol.name] ? { forks: true } : {}),
        ...(['Bridge', 'Cross Chain Bridge', 'Canonical Bridge'].includes(protocol.category) ? { bridges: true } : {}),
      };

      if (protocol.parentProtocol) {
        parentToChildProtocols[protocol.parentProtocol] = [
          ...(parentToChildProtocols[protocol.parentProtocol] ?? []),
          name,
        ];
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          ...(protocol.tvl ? { tvl: true } : {}),
        };
      }

      if (protocol.category === "Lending") {
        lendingProtocols += 1;
      }

      const chainTvls = Object.entries(protocol.chainTvls ?? {}).map((p: any) => [p[0], p[1]?.tvl ?? 0]).sort((a: any, b: any) => b[1] - a[1]);
      for (const [chain] of chainTvls) {
        if (chain.includes("-") || allExtraSections.includes(chain)) continue;
        protocolChainSetMap[protocol.defillamaId].add(chain);
      }
    }
    for (const protocol of tvlData.parentProtocols) {

      const name = slug(protocol.name);
      finalProtocols[protocol.id] = {
        name,
        yields: yieldsData.find(
          (pool: any) => pool.project === name || parentToChildProtocols[protocol.id]?.includes(pool.project)
        )
          ? true
          : false,
        ...finalProtocols[protocol.id],
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
      if (protocol.misrepresentedTokens) continue;
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

    const allNftMarketplaces = nftMarketplacesData.map((market: any) => market.exchangeName);
    for (const protocolNameAndId of nameAndIds) {
      const [protocolName, protocolId] = protocolNameAndId.split("+");
      if (allNftMarketplaces.includes(protocolName)) {
        finalProtocols[protocolId] = {
          ...finalProtocols[protocolId],
          nfts: true,
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
        displayName: chain,
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
        options: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          options: true,
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
        options: true,
      };
    }

    for (const protocol of optionsNotionalData.protocols) {
      finalProtocols[protocol.defillamaId] = {
        ...finalProtocols[protocol.defillamaId],
        options: true,
      };

      if (protocol.parentProtocol) {
        finalProtocols[protocol.parentProtocol] = {
          ...finalProtocols[protocol.parentProtocol],
          options: true,
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
        options: true,
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

    for (const protocolNameAndId of nameAndIds) {
      const [protocolName, protocolId] = protocolNameAndId.split("+");
      if (emmissionsData.includes(slug(protocolName))) {
        finalProtocols[protocolId] = {
          ...finalProtocols[protocolId],
          emissions: true,
        };
      }
    }


    const bridges = bridgesData.bridges.map((b: any) => b.displayName);

    for (const protocolNameAndId of nameAndIds) {
      const [protocolName, protocolId] = protocolNameAndId.split("+");
      if (bridges.includes(protocolName)) {
        finalProtocols[protocolId] = {
          ...finalProtocols[protocolId],
          bridge: true,
        };
      }
    }

    const sortedProtocolData = Object.keys(finalProtocols)
      .sort()
      .reduce((r: any, k) => {
        r[k] = finalProtocols[k];
        if (protocolInfoMap[k]) {
          r[k].displayName = protocolInfoMap[k].name;
          r[k].chains = protocolChainSetMap[k] ? Array.from(protocolChainSetMap[k]) : [];
        }
        if (parentProtocolsInfoMap[k]) {
          r[k].displayName = parentProtocolsInfoMap[k].name;
          const chainSet = new Set();
          parentProtocolsInfoMap[k].childProtocols?.forEach((p: any) => {
            const chains = protocolChainSetMap[p.id] ? Array.from(protocolChainSetMap[p.id]) : [];
            chains.forEach((chain: any) => chainSet.add(chain));
          });
          r[k].chains = Array.from(chainSet);
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

    for (const chain of chainsData) {
      if (finalChains[slug(chain.name)] && chain.gecko_id) {
        finalChains[slug(chain.name)] = {
          ...(finalChains[slug(chain.name)] ?? { name: chain.name }),
          gecko_id: chain.gecko_id,
          tokenSymbol: chain.tokenSymbol,
        };
      }
    }

    const sortedChainData = Object.keys(finalChains)
      .sort()
      .reduce((r: any, k) => ((r[k] = finalChains[k]), r), {});

    for (const _chain of Object.values(sortedChainData)) {
      const chain = _chain as any;
      chain.id = chainNameToIdMap[chain.name] ?? slug(chain.name);
      if (!chainNameToIdMap[chain.name])
        console.log(`Chain ${chain.name} does not have an id. using ${slug(chain.name)}`);
    }

    await storeRouteData("/config/smol/appMetadata-chains.json", sortedChainData);

    const totalTrackedByMetric = {
      tvl: { protocols: 0, chains: 0 },
      stablecoins: stablecoinsTracked,
      fees: { protocols: 0, chains: 0 },
      revenue: { protocols: 0, chains: 0 },
      holdersRevenue: { protocols: 0, chains: 0 },
      dexs: { protocols: 0, chains: 0 },
      dexAggregators: { protocols: 0, chains: 0 },
      perps: { protocols: 0, chains: 0 },
      perpAggregators: { protocols: 0, chains: 0 },
      options: { protocols: 0, chains: 0 },
      bridgeAggregators: { protocols: 0, chains: 0 },
      lending: { protocols: lendingProtocols, chains: 0 },
      treasury: { protocols: 0, chains: 0 },
      emissions: { protocols: 0, chains: 0 },
      forks: { protocols: 0, chains: 0 },
      oracles: { protocols: 0, chains: 0 },
      cexs: { protocols: 0, chains: 0 },
      bridgedTVL: { protocols: 0, chains: 0 },
      nfts: { protocols: 0, chains: 0 },
    };

    for (const p in sortedProtocolData) {
      const protocol = sortedProtocolData[p];
      if (protocol.tvl) {
        totalTrackedByMetric.tvl.protocols += 1;
      }
      if (protocol.fees) {
        totalTrackedByMetric.fees.protocols += 1;
      }
      if (protocol.revenue) {
        totalTrackedByMetric.revenue.protocols += 1;
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
      if (protocol.perpsAggregators) {
        totalTrackedByMetric.perpAggregators.protocols += 1;
      }
      if (protocol.options) {
        totalTrackedByMetric.options.protocols += 1;
      }
      if (protocol.bridgeAggregators) {
        totalTrackedByMetric.bridgeAggregators.protocols += 1;
      }
      if (protocol.emissions) {
        totalTrackedByMetric.emissions.protocols += 1;
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
        totalTrackedByMetric.revenue.chains += 1;
        totalTrackedByMetric.holdersRevenue.chains += 1;
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
      if (chain.perpsAggregators) {
        totalTrackedByMetric.perpAggregators.chains += 1;
      }
      if (chain.options) {
        totalTrackedByMetric.options.chains += 1;
      }
      if (chain.bridgeAggregators) {
        totalTrackedByMetric.bridgeAggregators.chains += 1;
      }
      if (chain.chainAssets) {
        totalTrackedByMetric.bridgedTVL.chains += 1;
      }
    }

    totalTrackedByMetric.nfts.chains += Object.keys(chainNftsData).length;

    for (const protocol in protocolInfoMap) {
      if (protocolInfoMap[protocol].category === "CEX") {
        totalTrackedByMetric.cexs.protocols += 1;
      }
    }

    await storeRouteData("/config/smol/appMetadata-totalTrackedByMetric.json", totalTrackedByMetric);

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
