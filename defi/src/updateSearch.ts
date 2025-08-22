import fetch from "node-fetch";
import { sluggifyString } from "./utils/sluggify";
import { storeR2 } from "./utils/r2";
import { cexsData } from "./getCexs";

const normalize = (str: string) =>
  sluggifyString(str)
    .replace(/[^a-zA-Z0-9_-]/, "")
    .replace(/[^a-zA-Z0-9_-]/, "")
    .replace(/[^a-zA-Z0-9_-]/, "");
const standardizeProtocolName = (tokenName = "") => tokenName?.toLowerCase().split(" ").join("-").split("'").join("");

async function generateSearchList() {
  const endAt = Date.now();
  const startAt = endAt - 1000 * 60 * 60 * 24 * 90;
  const [tvlData, stablecoinsData, frontendPages, tastyMetrics]: [
    {
      chains: string[];
      parentProtocols: any[];
      protocolCategories: string[];
      protocols: any[];
    },
    { peggedAssets: Array<{ name: string; symbol: string; circulating: { peggedUSD: number } }> },
    Record<string, Array<{ name: string; route: string }>>,
    Record<string, number>
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

  const protocols = tvlData.parentProtocols
    .map((parent) => ({
      id: `protocol_parent_${normalize(parent.name)}`,
      name: parent.name,
      symbol: parent.symbol,
      tvl: parentTvl[parent.id] ?? 0,
      logo: `https://icons.llamao.fi/icons/protocols/${standardizeProtocolName(parent.name)}?w=48&h=48`,
      route: `/protocol/${standardizeProtocolName(parent.name)}`,
      v: tastyMetrics[`/protocol/${standardizeProtocolName(parent.name)}`] ?? 0,
      type: "Protocol",
    }))
    .concat(
      tvlData.protocols.filter(p => p.name !== 'LlamaSwap').map((p) => ({
        id: `protocol_${normalize(p.name)}`,
        name: p.name,
        symbol: p.symbol,
        tvl: p.tvl,
        logo: `https://icons.llamao.fi/icons/protocols/${standardizeProtocolName(p.name)}?w=48&h=48`,
        route: `/protocol/${standardizeProtocolName(p.name)}`,
        ...(p.deprecated ? { deprecated: true } : {}),
        v: tastyMetrics[`/protocol/${standardizeProtocolName(p.name)}`] ?? 0,
        type: "Protocol",
      }))
    );

  const chains = tvlData.chains.map((chain) => ({
    id: `chain_${normalize(chain)}`,
    name: chain,
    logo: `https://icons.llamao.fi/icons/chains/rsz_${standardizeProtocolName(chain)}?w=48&h=48`,
    tvl: chainTvl[chain],
    route: `/chain/${standardizeProtocolName(chain)}`,
    v: tastyMetrics[`/chain/${standardizeProtocolName(chain)}`] ?? 0,
    type: "Chain",
  }));

  const categories = [] as any[];
  for (const category in categoryTvl) {
    categories.push({
      id: `category_${normalize(category)}`,
      name: category,
      tvl: categoryTvl[category],
      route: `/protocols/${standardizeProtocolName(category)}`,
      v: tastyMetrics[`/protocols/${standardizeProtocolName(category)}`] ?? 0,
      type: "Category",
    });
  }

  const tags = [] as any[];
  for (const tag in tagTvl) {
    tags.push({
      id: `tag_${normalize(tag)}`,
      name: tag,
      tvl: tagTvl[tag],
      route: `/protocols/${standardizeProtocolName(tag)}`,
      v: tastyMetrics[`/protocols/${standardizeProtocolName(tag)}`] ?? 0,
      type: "Tag",
    });
  }

  const stablecoins = stablecoinsData.peggedAssets.map((stablecoin) => ({
    id: `stablecoin_${normalize(stablecoin.name)}_${normalize(stablecoin.symbol)}`,
    name: stablecoin.name,
    symbol: stablecoin.symbol,
    mcap: stablecoin.circulating.peggedUSD,
    logo: `https://icons.llamao.fi/icons/pegged/${standardizeProtocolName(stablecoin.name)}?w=48&h=48`,
    route: `/stablecoin/${standardizeProtocolName(stablecoin.name)}`,
    v: tastyMetrics[`/stablecoin/${standardizeProtocolName(stablecoin.name)}`] ?? 0,
    type: "Stablecoin",
  }));

  const metrics = (frontendPages["Metrics"] ?? []).map((i) => ({
    id: `insight_${normalize(i.name)}`,
    name: i.name,
    route: i.route,
    v: tastyMetrics[i.route] ?? 0,
    type: "Metric",
  }));
  const tools = (frontendPages["Tools"] ?? []).map((t) => ({
    id: `tool_${normalize(t.name)}`,
    name: t.name,
    route: t.route,
    v: tastyMetrics[t.route] ?? 0,
    type: "Tool",
  }));

  const otherPages = []
  for (const category in frontendPages) {
    if (['Metrics', 'Tools'].includes(category)) continue;
    for (const page of frontendPages[category]) {
      otherPages.push({
        id: `page_${normalize(page.name)}`,
        name: page.name,
        route: page.route,
        v: tastyMetrics[page.route] ?? 0,
        type: "Insight",
      });
    }
  }

  const cexs = cexsData
    .filter((c) => c.slug)
    .map((c) => ({
      id: `cex_${normalize(c.name)}`,
      name: c.name,
      route: `/cex/${standardizeProtocolName(c.slug)}`,
      logo: `https://icons.llamao.fi/icons/protocols/${standardizeProtocolName(c.slug)}?w=48&h=48`,
      v: tastyMetrics[`/cex/${standardizeProtocolName(c.slug)}`] ?? 0,
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
    results: [
      ...results.chains,
      ...results.protocols,
      ...results.stablecoins,
      ...results.metrics,
      ...results.tools,
      ...results.categories,
      ...results.tags,
      ...results.cexs,
      ...results.otherPages,
    ],
    topResults: [
      ...results.chains.slice(0, 3),
      ...results.protocols.slice(0, 3),
      ...results.stablecoins.slice(0, 3),
      ...results.metrics.slice(0, 3),
      ...results.categories.slice(0, 3),
      ...results.tools.slice(0, 3),
      ...results.tags.slice(0, 3),
    ].map((r) => ({
      ...r,
      v: 0,
    })),
  };
}

const main = async () => {
  const { results, topResults } = await generateSearchList();

  await fetch(`https://search.defillama.com/indexes/pages/documents`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.SEARCH_MASTER_KEY}`,
    },
  }).then((r) => r.json());
  const submit = await fetch(`https://search.defillama.com/indexes/pages/documents`, {
    method: "POST",
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

  const errorMessage = status?.details?.error?.message;
  if (errorMessage) {
    console.log(errorMessage);
  }
  console.log(status);
};

//export default main
main();
