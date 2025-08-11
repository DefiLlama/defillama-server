import fetch from "node-fetch";
import { sluggifyString } from "./utils/sluggify";
import { storeR2 } from "./utils/r2";

const normalize = (str: string) =>
  sluggifyString(str)
    .replace(/[^a-zA-Z0-9_-]/, "")
    .replace(/[^a-zA-Z0-9_-]/, "")
    .replace(/[^a-zA-Z0-9_-]/, "");
const standardizeProtocolName = (tokenName = "") => tokenName?.toLowerCase().split(" ").join("-").split("'").join("");

async function generateSearchCategories() {
  const [tvlData, stablecoinsData]: [
    {
      chains: string[];
      parentProtocols: any[];
      protocolCategories: string[];
      protocols: any[];
    },
    { peggedAssets: Array<{ name: string; symbol: string; circulating: { peggedUSD: number } }> }
  ] = await Promise.all([
    fetch("https://api.llama.fi/lite/protocols2").then((r) => r.json()),
    fetch("https://stablecoins.llama.fi/stablecoins").then((r) => r.json()),
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

  const protocols = tvlData.protocols
    .map((p) => ({
      id: `protocol_${normalize(p.name)}`,
      name: p.name,
      symbol: p.symbol,
      tvl: p.tvl,
      logo: `https://icons.llamao.fi/icons/protocols/${standardizeProtocolName(p.name)}?w=48&h=48`,
      route: `/protocol/${standardizeProtocolName(p.name)}`,
      ...(p.deprecated ? { deprecated: true } : {}),
    }))
    .concat(
      tvlData.parentProtocols.map((parent) => ({
        id: `protocol_parent_${normalize(parent.name)}`,
        name: parent.name,
        symbol: parent.symbol,
        tvl: parentTvl[parent.id] ?? 0,
        logo: `https://icons.llamao.fi/icons/protocols/${standardizeProtocolName(parent.name)}?w=48&h=48`,
        route: `/protocol/${standardizeProtocolName(parent.name)}`,
      }))
    )
    .sort((a, b) => b.tvl - a.tvl);

  const chains = tvlData.chains.map((chain) => ({
    id: `chain_${normalize(chain)}`,
    name: chain,
    logo: `https://icons.llamao.fi/icons/chains/rsz_${standardizeProtocolName(chain)}?w=48&h=48`,
    tvl: chainTvl[chain],
    route: `/chain/${standardizeProtocolName(chain)}`,
  }));

  const categories = [] as any[];
  for (const category in categoryTvl) {
    categories.push({
      id: `category_${normalize(category)}`,
      name: `All protocols in ${category}`,
      tvl: categoryTvl[category],
      route: `/protocols/${standardizeProtocolName(category)}`,
    });
  }

  const tags = [] as any[];
  for (const tag in tagTvl) {
    tags.push({
      id: `tag_${normalize(tag)}`,
      name: `All protocols in ${tag}`,
      tvl: tagTvl[tag],
      route: `/protocols/${standardizeProtocolName(tag)}`,
    });
  }

  const stablecoins = stablecoinsData.peggedAssets
    .map((stablecoin) => ({
      id: `stablecoin_${normalize(stablecoin.name)}`,
      name: stablecoin.name,
      symbol: stablecoin.symbol,
      mcap: stablecoin.circulating.peggedUSD,
      logo: `https://icons.llamao.fi/icons/pegged/${standardizeProtocolName(stablecoin.name)}?w=48&h=48`,
      route: `/stablecoin/${standardizeProtocolName(stablecoin.name)}`,
    }))
    .sort((a, b) => b.mcap - a.mcap);

  return {
    chains,
    protocols,
    stablecoins,
    categories: categories.sort((a, b) => b.tvl - a.tvl),
    tags: tags.sort((a, b) => b.tvl - a.tvl),
  };
}

async function generateSearchList() {
  const { chains, protocols, stablecoins, categories, tags } = await generateSearchCategories();
  let searchListV1 = [...chains, ...protocols, ...stablecoins, ...categories, ...tags];
  let searchListV2 = [
    { category: "Chains", pages: chains, route: "/chains" },
    { category: "Protocols", pages: protocols, route: "/" },
    { category: "Stablecoins", pages: stablecoins, route: "/stablecoins" },
    { category: "Categories", pages: categories, route: "/categories" },
    { category: "Tags", pages: tags, route: "/categories" },
  ];
  return { searchListV1, searchListV2 };
}

const main = async () => {
  const { searchListV1, searchListV2 } = await generateSearchList();
  await fetch(`https://search.defillama.com/indexes/protocols/documents`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.SEARCH_MASTER_KEY}`,
    },
  }).then((r) => r.json());
  const submit = await fetch(`https://search.defillama.com/indexes/protocols/documents`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.SEARCH_MASTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(searchListV1),
  }).then((r) => r.json());
  const status = await fetch(`https://search.defillama.com/tasks/${submit.taskUid}`, {
    headers: {
      Authorization: `Bearer ${process.env.SEARCH_MASTER_KEY}`,
    },
  }).then((r) => r.json());

  await storeR2("searchlist.json", JSON.stringify(searchListV2), true, false).catch((e) => {
    console.log("Error storing search list v2", e);
  });

  const errorMessage = status?.details?.error?.message;
  if (errorMessage) {
    console.log(errorMessage);
  }
  console.log(status);
};

//export default main
main();
