import fetch from "node-fetch";
import { sluggifyString } from "./utils/sluggify";
import { storeR2 } from "./utils/r2";

const normalize = (str: string) =>
  sluggifyString(str)
    .replace(/[^a-zA-Z0-9_-]/, "")
    .replace(/[^a-zA-Z0-9_-]/, "")
    .replace(/[^a-zA-Z0-9_-]/, "");
const standardizeProtocolName = (tokenName = "") => tokenName?.toLowerCase().split(" ").join("-").split("'").join("");

async function generateSearchList() {
  const endAt = Date.now();
  const startAt = endAt - 1000 * 60 * 60 * 24 * 90;
  const [tvlData, stablecoinsData, tastyMetrics]: [
    {
      chains: string[];
      parentProtocols: any[];
      protocolCategories: string[];
      protocols: any[];
    },
    { peggedAssets: Array<{ name: string; symbol: string; circulating: { peggedUSD: number } }> },
    Record<string, number>
  ] = await Promise.all([
    fetch("https://api.llama.fi/lite/protocols2").then((r) => r.json()),
    fetch("https://stablecoins.llama.fi/stablecoins").then((r) => r.json()),
    fetch(
      `${process.env.TASTY_API_URL}/metrics?startAt=${startAt}&endAt=${endAt}&unit=day&type=url`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TASTY_API_KEY}`,
        },
      }
    )
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
    }))
    .concat(
      tvlData.protocols.map((p) => ({
        id: `protocol_${normalize(p.name)}`,
        name: p.name,
        symbol: p.symbol,
        tvl: p.tvl,
        logo: `https://icons.llamao.fi/icons/protocols/${standardizeProtocolName(p.name)}?w=48&h=48`,
        route: `/protocol/${standardizeProtocolName(p.name)}`,
        ...(p.deprecated ? { deprecated: true } : {}),
        v: tastyMetrics[`/protocol/${standardizeProtocolName(p.name)}`] ?? 0,
      }))
    );

  const chains = tvlData.chains.map((chain) => ({
    id: `chain_${normalize(chain)}`,
    name: chain,
    logo: `https://icons.llamao.fi/icons/chains/rsz_${standardizeProtocolName(chain)}?w=48&h=48`,
    tvl: chainTvl[chain],
    route: `/chain/${standardizeProtocolName(chain)}`,
    v: tastyMetrics[`/chain/${standardizeProtocolName(chain)}`] ?? 0,
  }));

  const categories = [] as any[];
  for (const category in categoryTvl) {
    categories.push({
      id: `category_${normalize(category)}`,
      name: `All protocols in ${category}`,
      tvl: categoryTvl[category],
      route: `/protocols/${standardizeProtocolName(category)}`,
      v: tastyMetrics[`/protocols/${standardizeProtocolName(category)}`] ?? 0,
    });
  }

  const tags = [] as any[];
  for (const tag in tagTvl) {
    tags.push({
      id: `tag_${normalize(tag)}`,
      name: `All protocols in ${tag}`,
      tvl: tagTvl[tag],
      route: `/protocols/${standardizeProtocolName(tag)}`,
      v: tastyMetrics[`/protocols/${standardizeProtocolName(tag)}`] ?? 0,
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
  }));

  return {
    chains: chains.sort((a, b) => b.v - a.v),
    protocols: protocols.sort((a, b) => b.v - a.v),
    stablecoins: stablecoins.sort((a, b) => b.v - a.v),
    categories: categories.sort((a, b) => b.v - a.v),
    tags: tags.sort((a, b) => b.v - a.v),
  };
}

const main = async () => {
  const results = await generateSearchList();

  const searchList = [
    { id: "Chain", type: "Chain", pages: results.chains },
    { id: "Protocol", type: "Protocol", pages: results.protocols },
    { id: "Stablecoin", type: "Stablecoin", pages: results.stablecoins },
    { id: "Category", type: "Category", pages: results.categories },
    { id: "Tag", type: "Tag", pages: results.tags },
  ];

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
    body: JSON.stringify(searchList),
  }).then((r) => r.json());
  const status = await fetch(`https://search.defillama.com/tasks/${submit.taskUid}`, {
    headers: {
      Authorization: `Bearer ${process.env.SEARCH_MASTER_KEY}`,
    },
  }).then((r) => r.json());

  await storeR2("searchlist.json", JSON.stringify(searchList), true, false).catch((e) => {
    console.log("Error storing search list", e);
  });

  const errorMessage = status?.details?.error?.message;
  if (errorMessage) {
    console.log(errorMessage);
  }
  console.log(status);
};

//export default main
main();
