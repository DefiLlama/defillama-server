import fetch from "node-fetch";
import { sluggifyString } from "./utils/sluggify";
import { storeR2 } from "./utils/r2";
import { cexsData } from "./getCexs";
import { IChainMetadata, IProtocolMetadata } from "./api2/cron-task/types";


const normalize = (str: string) => (str ? sluggifyString(str).replace(/[^a-zA-Z0-9_-]/g, "") : "");

interface SearchResult {
  id: string;
  name: string;
  subName?: string;
  symbol?: string;
  route: string;
  logo?: string;
  tvl?: number;
  mcap?: number;
  deprecated?: boolean;
  type: string;
  hideType?: boolean;
  v: number;
}

const getProtocolSubSections = ({
  result,
  metadata,
  geckoId,
  tastyMetrics,
  protocolData,
  childProtocols,
}: {
  result: SearchResult;
  metadata: IProtocolMetadata;
  geckoId: string | null;
  tastyMetrics: Record<string, number>;
  protocolData: { name: string; id?: string };
  childProtocols?: Array<string>;
}) => {
  const subSections: Array<SearchResult> = [];

  if (result.tvl) {
    subSections.push({
      ...result,
      id: `${result.id}_tvl`,
      subName: "TVL",
      route: `${result.route}?tvl=true`,
    });
  }

  if (metadata?.fees) {
    subSections.push({
      ...result,
      id: `${result.id}_fees`,
      subName: "Fees",
      route: `${result.route}?tvl=false&fees=true`,
    });
  }

  if (metadata?.revenue) {
    subSections.push({
      ...result,
      id: `${result.id}_revenue`,
      subName: "Revenue",
      route: `${result.route}?tvl=false&revenue=true`,
    });
  }

  if (metadata?.holdersRevenue) {
    subSections.push({
      ...result,
      id: `${result.id}_holdersRevenue`,
      subName: "Holders Revenue",
      route: `${result.route}?tvl=false&holdersRevenue=true`,
    });
  }

  if (metadata?.dexs) {
    subSections.push({
      ...result,
      id: `${result.id}_dexVolume`,
      subName: "DEX Volume",
      route: `${result.route}?tvl=false&dexVolume=true`,
    });
  }

  if (metadata?.perps) {
    subSections.push({
      ...result,
      id: `${result.id}_perpVolume`,
      subName: "Perp Volume",
      route: `${result.route}?tvl=false&perpVolume=true`,
    });
  }

  if (metadata?.optionsPremiumVolume) {
    subSections.push({
      ...result,
      id: `${result.id}_optionsPremiumVolume`,
      subName: "Options Premium Volume",
      route: `${result.route}?tvl=false&optionsPremiumVolume=true`,
    });
  }

  if (metadata?.optionsNotionalVolume) {
    subSections.push({
      ...result,
      id: `${result.id}_optionsNotionalVolume`,
      subName: "Options Notional Volume",
      route: `${result.route}?tvl=false&optionsNotionalVolume=true`,
    });
  }

  if (metadata?.perpsAggregators) {
    subSections.push({
      ...result,
      id: `${result.id}_perpAggregatorVolume`,
      subName: "Perp Aggregator Volume",
      route: `${result.route}?tvl=false&perpAggregatorVolume=true`,
    });
  }

  if (metadata?.bridgeAggregators) {
    subSections.push({
      ...result,
      id: `${result.id}_bridgeAggregatorVolume`,
      subName: "Bridge Aggregator Volume",
      route: `${result.route}?tvl=false&bridgeAggregatorVolume=true`,
    });
  }

  if (metadata?.dexAggregators) {
    subSections.push({
      ...result,
      id: `${result.id}_dexAggregatorVolume`,
      subName: "DEX Aggregator Volume",
      route: `${result.route}?tvl=false&dexAggregatorVolume=true`,
    });
  }

  if (metadata?.bridge) {
    subSections.push({
      ...result,
      id: `${result.id}_bridgeVolume`,
      subName: "Bridge Volume",
      route: `/bridge/${sluggifyString(protocolData.name)}`,
    });
  }

  if (geckoId) {
    subSections.push({
      ...result,
      id: `${result.id}_mcap`,
      subName: "Mcap",
      route: `${result.route}?tvl=false&mcap=true`,
    });
    subSections.push({
      ...result,
      id: `${result.id}_fdv`,
      subName: "FDV",
      route: `${result.route}?tvl=false&fdv=true`,
    });
    subSections.push({
      ...result,
      id: `${result.id}_tokenPrice`,
      subName: "Token Price",
      route: `${result.route}?tvl=false&tokenPrice=true`,
    });
    subSections.push({
      ...result,
      id: `${result.id}_tokenVolume`,
      subName: "Token Volume",
      route: `${result.route}?tvl=false&tokenVolume=true`,
    });
  }

  if (metadata?.liquidity) {
    subSections.push({
      ...result,
      id: `${result.id}_tokenLiquidity`,
      subName: "Token Liquidity",
      route: `${result.route}?tvl=false&tokenLiquidity=true`,
    });
  }

  if (metadata?.emissions) {
    subSections.push({
      ...result,
      id: `${result.id}_unlocks`,
      subName: "Unlocks",
      route: `/unlocks/${sluggifyString(protocolData.name)}`,
    });
  }

  if (metadata?.incentives) {
    subSections.push({
      ...result,
      id: `${result.id}_incentives`,
      subName: "Incentives",
      route: `${result.route}?tvl=false&incentives=true`,
    });
  }

  if (metadata?.yields) {
    subSections.push({
      ...result,
      id: `${result.id}_yields`,
      subName: "Yields",
      route:
        childProtocols && childProtocols.length > 0
          ? `/yields?${childProtocols.map((p) => `project=${p}`).join("&")}`
          : `/yields?project=${protocolData.name}`,
    });
    if (!protocolData?.id?.startsWith("parent#")) {
      subSections.push({
        ...result,
        id: `${result.id}_medianApy`,
        subName: "Median APY",
        route: `${result.route}?tvl=false&medianApy=true`,
      });
    }
  }

  if (metadata?.treasury) {
    subSections.push({
      ...result,
      id: `${result.id}_treasury`,
      subName: "Treasury",
      route: `/protocol/treasury/${sluggifyString(protocolData.name)}`,
    });
  }

  if (metadata?.forks) {
    subSections.push({
      ...result,
      id: `${result.id}_forks`,
      subName: "Forks",
      route: `/protocol/forks/${sluggifyString(protocolData.name)}`,
    });
  }

  return subSections.map((result) => ({
    ...result,
    v: tastyMetrics[result.route] ?? 0,
  }));
};

async function getAllCurrentSearchResults() {
  const allResults: Array<SearchResult> = [];
  let offset = 0;
  const limit = 100e3;
  let hasMore = true;

  while (hasMore) {
    const res: { total: number; results: Array<SearchResult> } = await fetch(
      `https://search.defillama.com/indexes/pages/documents?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SEARCH_MASTER_KEY}`,
        },
      }
    ).then((res) => res.json());

    allResults.push(...res.results);
    
    // Check if we've fetched all results
    if (res.results.length < limit || allResults.length >= res.total) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return allResults;
}

function getResultsToDelete(currentResults: Array<SearchResult>, newResults: Array<SearchResult>) {
  const newResultsSet = new Set(newResults.map((r) => r.id));

  return currentResults
    .map((item) => item.id)
    .filter((itemId) => {
      return !newResultsSet.has(itemId)
    })
}

async function generateSearchList() {
  const endAt = Date.now();
  const startAt = endAt - 1000 * 60 * 60 * 24 * 90;
  const [
    tvlData,
    stablecoinsData,
    frontendPages,
    tastyMetrics,
    protocolsMetadata,
    chainsMetadata,
    currentSearchResults,
  ]: [
    {
      chains: string[];
      parentProtocols: any[];
      protocolCategories: string[];
      protocols: any[];
    },
    { peggedAssets: Array<{ name: string; symbol: string; circulating: { peggedUSD: number } }> },
    Record<string, Array<{ name: string; route: string }>>,
    Record<string, number>,
    Record<string, IProtocolMetadata>,
    Record<string, IChainMetadata>,
    Array<SearchResult>
  ] = await Promise.all([
    fetch("https://api.llama.fi/lite/protocols2").then((r) => r.json()),
    fetch("https://stablecoins.llama.fi/stablecoins").then((r) => r.json()),
    fetch("https://defillama.com/pages.json")
      .then((r) => r.json())
      .catch((e) => {
        console.log("Error fetching frontend pages", e);
        return {};
      }),
    fetch(`${process.env.TASTY_API_URL}/metrics?startAt=${startAt}&endAt=${endAt}&unit=day&type=url`, {
      headers: {
        Authorization: `Bearer ${process.env.TASTY_API_KEY}`,
      },
    })
      .then((r) => r.json())
      .then((res: Array<{ x: string; y: number }>) => {
        const final = {} as Record<string, number>;
        for (const xy of res) {
          final[xy.x] = xy.y;
        }
        return final;
      })
      .catch((e) => {
        console.log("Error fetching tasty metrics", e);
        return {};
      }),
    fetch("https://api.llama.fi/config/smol/appMetadata-protocols.json").then((res) => res.json()),
    fetch("https://api.llama.fi/config/smol/appMetadata-chains.json").then((res) => res.json()),
    getAllCurrentSearchResults(),
  ]);
  const parentTvl = {} as any;
  const chainTvl = {} as any;
  const categoryTvl = {} as any;
  const tagTvl = {} as any;
  const addOrCreate = (acc: any, key: string, val: number) => {
    if (!acc[key]) {
      acc[key] = val;
    } else {
      acc[key] += val;
    }
  };
  for (const p of tvlData.protocols) {
    for (const chain in p.chainTvls) {
      addOrCreate(chainTvl, chain, (p.chainTvls[chain] as any).tvl);
    }
    addOrCreate(categoryTvl, p.category, p.tvl);
    for (const tag of p.tags ?? []) {
      addOrCreate(tagTvl, tag, p.tvl);
    }
    if (p.parentProtocol) {
      addOrCreate(parentTvl, p.parentProtocol, p.tvl);
    }
  }

  const protocols: Array<SearchResult> = [];
  const subProtocols: Array<SearchResult> = [];
  for (const parent of tvlData.parentProtocols) {
    const result = {
      id: `protocol_parent_${normalize(parent.name)}`,
      name: parent.name,
      symbol: parent.symbol,
      tvl: parentTvl[parent.id] ?? 0,
      logo: `https://icons.llamao.fi/icons/protocols/${sluggifyString(parent.name)}?w=48&h=48`,
      route: `/protocol/${sluggifyString(parent.name)}`,
      v: tastyMetrics[`/protocol/${sluggifyString(parent.name)}`] ?? 0,
      type: "Protocol",
    };

    protocols.push(result);

    const metadata = protocolsMetadata[parent.id];
    const childProtocols = tvlData.protocols.filter((p) => p.parentProtocol === parent.id).map((p) => p.name);
    const subSections = getProtocolSubSections({
      result,
      metadata,
      geckoId: parent.gecko_id ?? null,
      tastyMetrics,
      protocolData: parent,
      childProtocols,
    });
    subProtocols.push(...subSections);
  }

  for (const protocol of tvlData.protocols) {
    if (protocol.name === "LlamaSwap") continue;
    const result = {
      id: `protocol_${normalize(protocol.name)}`,
      name: protocol.name,
      symbol: protocol.symbol,
      tvl: protocol.tvl,
      logo: `https://icons.llamao.fi/icons/protocols/${sluggifyString(protocol.name)}?w=48&h=48`,
      route: `/protocol/${sluggifyString(protocol.name)}`,
      ...(protocol.deprecated ? { deprecated: true } : {}),
      v: tastyMetrics[`/protocol/${sluggifyString(protocol.name)}`] ?? 0,
      type: "Protocol",
    };

    protocols.push(result);

    const metadata = protocolsMetadata[protocol.defillamaId];
    const subSections = getProtocolSubSections({
      result,
      metadata,
      geckoId: protocol.geckoId ?? null,
      tastyMetrics,
      protocolData: protocol,
    });
    subProtocols.push(...subSections);
  }

  const chains: Array<SearchResult> = [];
  const subChains: Array<SearchResult> = [];
  for (const chain of tvlData.chains) {
    const result = {
      id: `chain_${normalize(chain)}`,
      name: chain,
      logo: `https://icons.llamao.fi/icons/chains/rsz_${sluggifyString(chain)}?w=48&h=48`,
      tvl: chainTvl[chain],
      route: `/chain/${sluggifyString(chain)}`,
      v: tastyMetrics[`/chain/${sluggifyString(chain)}`] ?? 0,
      type: "Chain",
    };

    chains.push(result);

    const metadata = chainsMetadata[sluggifyString(chain)];
    const subSections: Array<SearchResult> = [];

    if (metadata?.stablecoins) {
      subSections.push({
        ...result,
        id: `${result.id}_stablecoinsMcap`,
        subName: "Stablecoins Mcap",
        route: `${result.route}?tvl=false&stablecoinsMcap=true`,
      });

      subSections.push({
        ...result,
        id: `${result.id}_stablecoinsSupplyRankings`,
        subName: "Stablecoins Supply Rankings",
        route: `/stablecoins/${sluggifyString(chain)}`,
      });
    }

    if (metadata?.chainFees) {
      subSections.push({
        ...result,
        id: `${result.id}_chainFees`,
        subName: "Chain Fees",
        route: `${result.route}?tvl=false&chainFees=true`,
      });
    }

    if (metadata?.chainRevenue) {
      subSections.push({
        ...result,
        id: `${result.id}_chainRevenue`,
        subName: "Chain Revenue",
        route: `${result.route}?tvl=false&chainRevenue=true`,
      });
    }

    if (metadata?.fees) {
      subSections.push({
        ...result,
        id: `${result.id}_appFees`,
        subName: "App Fees",
        route: `${result.route}?tvl=false&appFees=true`,
      });

      subSections.push({
        ...result,
        id: `${result.id}_protocolsByFees`,
        subName: "Protocols by Fees",
        route: `/fees/chain/${sluggifyString(chain)}`,
      });
    }

    if (metadata?.revenue) {
      subSections.push({
        ...result,
        id: `${result.id}_appRevenue`,
        subName: "App Revenue",
        route: `${result.route}?tvl=false&appRevenue=true`,
      });

      subSections.push({
        ...result,
        id: `${result.id}_protocolsByRevenue`,
        subName: "Protocols by Revenue",
        route: `/revenue/chain/${sluggifyString(chain)}`,
      });
    }

    if (metadata?.dexs) {
      subSections.push({
        ...result,
        id: `${result.id}_dexsVolume`,
        subName: "DEXs Volume",
        route: `${result.route}?tvl=false&dexsVolume=true`,
      });

      subSections.push({
        ...result,
        id: `${result.id}_protocolsByDexVolume`,
        subName: "Protocols by DEX Volume",
        route: `/dexs/chain/${sluggifyString(chain)}`,
      });
    }

    if (metadata?.perps) {
      subSections.push({
        ...result,
        id: `${result.id}_perpsVolume`,
        subName: "Perps Volume",
        route: `${result.route}?tvl=false&perpsVolume=true`,
      });

      subSections.push({
        ...result,
        id: `${result.id}_protocolsByPerpVolume`,
        subName: "Protocols by Perp Volume",
        route: `/perps/chain/${sluggifyString(chain)}`,
      });

      subSections.push({
        ...result,
        id: `${result.id}_protocolsByOpenInterest`,
        subName: "Protocols by Open Interest",
        route: `/open-interest/chain/${sluggifyString(chain)}`,
      });
    }

    if (metadata?.optionsPremiumVolume) {
      subSections.push({
        ...result,
        id: `${result.id}_protocolsByOptionPremiumVolume`,
        subName: "Protocols by Option Premium Volume",
        route: `/options/premium-volume/${sluggifyString(chain)}`,
      });
    }

    if (metadata?.optionsNotionalVolume) {
      subSections.push({
        ...result,
        id: `${result.id}_protocolsByOptionNotionalVolume`,
        subName: "Protocols by Option Notional Volume",
        route: `/options/notional-volume/chain/${sluggifyString(chain)}`,
      });
    }

    if (metadata?.dexAggregators) {
      subSections.push({
        ...result,
        id: `${result.id}_protocolsByDexAggregatorVolume`,
        subName: "Protocols by DEX Aggregator Volume",
        route: `/dex-aggregators/chain/${sluggifyString(chain)}`,
      });
    }

    if (metadata?.bridgeAggregators) {
      subSections.push({
        ...result,
        id: `${result.id}_protocolsByBridgeAggregatorVolume`,
        subName: "Protocols by Bridge Aggregator Volume",
        route: `/bridge-aggregators/chain/${sluggifyString(chain)}`,
      });
    }

    if (metadata?.perpsAggregators) {
      subSections.push({
        ...result,
        id: `${result.id}_protocolsByPerpAggregatorVolume`,
        subName: "Protocols by Perp Aggregator Volume",
        route: `/perps-aggregators/chain/${sluggifyString(chain)}`,
      });
    }

    if (metadata?.chainAssets) {
      subSections.push({
        ...result,
        id: `${result.id}_bridgedTvl`,
        subName: "Bridged TVL",
        route: `/bridged/${sluggifyString(chain)}`,
      });
    }

    if (metadata?.inflows) {
      subSections.push({
        ...result,
        id: `${result.id}_netInflows`,
        subName: "Net Inflows",
        route: `${result.route}?tvl=false&netInflows=true`,
      });
    }

    if (metadata?.incentives) {
      subSections.push({
        ...result,
        id: `${result.id}_incentives`,
        subName: "Incentives",
        route: `${result.route}?tvl=false&tokenIncentives=true`,
      });
    }

    if (metadata?.activeUsers) {
      subSections.push({
        ...result,
        id: `${result.id}_activeAddresses`,
        subName: "Active Addresses",
        route: `${result.route}?tvl=false&activeAddresses=true`,
      });

      subSections.push({
        ...result,
        id: `${result.id}_transactions`,
        subName: "Transactions",
        route: `${result.route}?tvl=false&transactions=true`,
      });
    }

    if (metadata?.gecko_id) {
      subSections.push({
        ...result,
        id: `${result.id}_chainTokenPrice`,
        subName: `${metadata.tokenSymbol ?? "Token"} Price`,
        route: `${result.route}?tvl=false&chainTokenPrice=true`,
      });

      subSections.push({
        ...result,
        id: `${result.id}_chainTokenMcap`,
        subName: `${metadata.tokenSymbol ?? "Token"} Mcap`,
        route: `${result.route}?tvl=false&chainTokenMcap=true`,
      });

      subSections.push({
        ...result,
        id: `${result.id}_chainTokenVolume`,
        subName: `${metadata.tokenSymbol ?? "Token"} Volume`,
        route: `${result.route}?tvl=false&chainTokenVolume=true`,
      });
    }

    subChains.push(...subSections.map((result) => ({ ...result, v: tastyMetrics[result.route] ?? 0 })));
  }

  const categories: Array<SearchResult> = [];
  const categoriesIds = new Set<string>();
  for (const category in categoryTvl) {
    categories.push({
      id: `category_${normalize(category)}`,
      name: category,
      tvl: categoryTvl[category],
      route: `/protocols/${sluggifyString(category)}`,
      v: tastyMetrics[`/protocols/${sluggifyString(category)}`] ?? 0,
      type: "Category",
    });
  }
  categories.forEach((c) => categoriesIds.add(c.id));

  const tags: Array<SearchResult> = [];
  const tagsIds = new Set<string>();
  for (const tag in tagTvl) {
    tags.push({
      id: `tag_${normalize(tag)}`,
      name: tag,
      tvl: tagTvl[tag],
      route: `/protocols/${sluggifyString(tag)}`,
      v: tastyMetrics[`/protocols/${sluggifyString(tag)}`] ?? 0,
      type: "Tag",
    });
  }
  tags.forEach((t) => tagsIds.add(t.id));

  const stablecoins: Array<SearchResult> = stablecoinsData.peggedAssets.map((stablecoin) => ({
    id: `stablecoin_${normalize(stablecoin.name)}_${normalize(stablecoin.symbol)}`,
    name: stablecoin.name,
    symbol: stablecoin.symbol,
    mcap: stablecoin.circulating.peggedUSD,
    logo: `https://icons.llamao.fi/icons/pegged/${sluggifyString(stablecoin.name)}?w=48&h=48`,
    route: `/stablecoin/${sluggifyString(stablecoin.name)}`,
    v: tastyMetrics[`/stablecoin/${sluggifyString(stablecoin.name)}`] ?? 0,
    type: "Stablecoin",
  }));

  const metrics: Array<SearchResult> = (frontendPages["Metrics"] ?? []).map((i) => ({
    id: `metric_${normalize(i.name)}`,
    name: i.name,
    route: i.route,
    v: tastyMetrics[i.route] ?? 0,
    type: "Metric",
  }));

  const tools: Array<SearchResult> = (frontendPages["Tools"] ?? []).map((t) => ({
    id: `tool_${normalize(t.name)}`,
    name: t.name,
    route: t.route,
    v: tastyMetrics[t.route] ?? 0,
    type: "Tool",
  }));

  const otherPages: Array<SearchResult> = [];
  for (const category in frontendPages) {
    if (["Metrics", "Tools"].includes(category)) continue;
    for (const page of frontendPages[category]) {
      otherPages.push({
        id: `others_${normalize(page.name)}`,
        name: page.name,
        route: page.route,
        v: tastyMetrics[page.route] ?? 0,
        type: "Others",
        hideType: true,
      });
    }
  }

  const cexs: Array<SearchResult> = cexsData
    .filter((c) => c.slug)
    .map((c) => ({
      id: `cex_${normalize(c.name)}`,
      name: c.name,
      route: `/cex/${sluggifyString(c.slug!)}`,
      logo: `https://icons.llamao.fi/icons/protocols/${sluggifyString(c.slug!)}?w=48&h=48`,
      v: tastyMetrics[`/cex/${sluggifyString(c.slug!)}`] ?? 0,
      type: "CEX",
    }));

  const results = {
    chains: chains.sort((a, b) => b.v - a.v),
    protocols: protocols.sort((a, b) => b.v - a.v),
    stablecoins: stablecoins.sort((a, b) => b.v - a.v),
    metrics: metrics.sort((a, b) => b.v - a.v),
    tools: tools.sort((a, b) => b.v - a.v),
    categories: categories.sort((a, b) => b.v - a.v),
    tags: tags.sort((a, b) => b.v - a.v),
    cexs: cexs.sort((a, b) => b.v - a.v),
    otherPages: otherPages.sort((a, b) => b.v - a.v),
  };

  return {
    results: results.chains
      .concat(results.protocols)
      .concat(results.stablecoins)
      .concat(results.metrics)
      .concat(results.tools)
      .concat(results.categories)
      .concat(results.tags)
      .concat(results.cexs)
      .concat(results.otherPages)
      .concat(subProtocols)
      .concat(subChains),
    topResults: results.chains
      .slice(0, 3)
      .concat(results.protocols.slice(0, 3))
      .concat(results.stablecoins.slice(0, 3))
      .concat(results.metrics.slice(0, 3))
      .concat(results.categories.slice(0, 3))
      .concat(results.tools.slice(0, 3))
      .concat(results.tags.slice(0, 3))
      .map((r) => ({
        ...r,
        v: 0,
      })),
    currentSearchResults,
  };
}

const main = async () => {
  const { results, topResults, currentSearchResults } = await generateSearchList();

  if (results.length === 0) {
    console.log("No results to submit");
    return;
  }

  const resultsToDelete = getResultsToDelete(currentSearchResults, results);

  const deletedResults = await fetch(`https://search.defillama.com/indexes/pages/documents/delete-batch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SEARCH_MASTER_KEY}`,
    },
    body: JSON.stringify(resultsToDelete),
  }).then((r) => r.json());

  const deletedResultsErrorMessage = deletedResults?.details?.error?.message;
  if (deletedResultsErrorMessage) {
    console.log(deletedResultsErrorMessage);
  }

  // Add a list of documents or update them if they already exist. If the provided index does not exist, it will be created.
  const submit = await fetch(`https://search.defillama.com/indexes/pages/documents`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${process.env.SEARCH_MASTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results),
  }).then((r) => r.json());

  const status = await fetch(`https://search.defillama.com/tasks/${submit.taskUid}`, {
    headers: {
      Authorization: `Bearer ${process.env.SEARCH_MASTER_KEY}`,
    },
  }).then((r) => r.json());

  await storeR2("searchlist.json", JSON.stringify(topResults), true, false).catch((e) => {
    console.log("Error storing top results search list", e);
  });

  const submitErrorMessage = status?.details?.error?.message;
  if (submitErrorMessage) {
    console.log(submitErrorMessage);
  }
  console.log(status);
};

//export default main
main();
