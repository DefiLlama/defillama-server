import { getCurrentUnixTimestamp } from "../../utils/date";
import { addToDBWritesList } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { getConfig } from "../../utils/cache";
import fetch from "node-fetch";

const now = getCurrentUnixTimestamp();

type Feed = {
  id: string;
  symbol: string;
}

async function fetchFeedIds(): Promise<Feed[]> {
  const feedsRes = await getConfig('pyth-feeds', `https://benchmarks.pyth.network/v1/price_feeds/`);
  const feeds: Feed[] = [];
  feedsRes.forEach(({ id, attributes: { symbol = undefined, quote_currency = undefined } = {} }: any = {}) => {
    if (!id || !symbol || quote_currency !== 'USD') return;
    feeds.push({ id: '0x' + id, symbol: symbol.replace(/\//g, ':') } as any);
  })

  return feeds;
}

async function pyth(timestamp: number = now) {
  // if (timestamp != now) return [];
  const api = await getApi('arbitrum', timestamp);
  const THREE_DAYS = 3 * 24 * 60 * 60;
  const threeDaysAgo = (timestamp ? timestamp : now) - THREE_DAYS;

  const feeds: Feed[] = await fetchFeedIds();
  const contract = '0xff1a0f4744e8582df1ae09d5611b887b6a12925c'
  const calls = feeds.map(i => i.id)
  const res = await api.multiCall({ target: contract, abi: "function getPriceUnsafe(bytes32 id) view returns ((int64 price, uint64 conf, int32 expo, uint256 publishTime) price)", calls, permitFailure: true, })
  const writes: Write[] = [];
  res.forEach((i, idx) => {
    if (!i) return;
    const { price, expo, publishTime } = i;
    if (!price) return;
    if (publishTime < threeDaysAgo) return;
    const { symbol } = feeds[idx];
    addToDBWritesList(writes, 'pyth', symbol, price * (10 ** expo), 0, symbol, timestamp, 'pyth', 0.95)
  })

  return writes;
}

const margin = 1 * 60 * 60; // 1 hour

const priceIds = [
  "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b", // AUSD usd
  "0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2", // AXAU gold
  "0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e", // AXAG silver
  "0x80367e9664197f37d89a07a804dffd2101c479c7c4e8490501bc9d9e1e7f9021", // AXPD palladium
  "0x398e4bbc7cbf89d6648c21e08019d878967677753b3096799595c78f805a34e5", // AXPT platinum
];

async function pythHermes(timestamp: number = 0) {
  if (timestamp != 0) throw new Error("pythHermes must run at timestamp = 0");
  let url = "https://hermes.pyth.network/v2/updates/price/latest?";
  priceIds.forEach((token) => {
    url += `ids%5B%5D=${token}&`;
  });

  const res = await fetch(url).then((r) => r.json());

  const prices: { [key: string]: number } = {};
  res.parsed.forEach(({ price: { price, expo, publish_time }, id }: any) => {
    if (publish_time < now - margin) return;
    prices[`0x${id.toString()}`] = price * 10 ** expo;
  });

  const feedsIds = await fetchFeedIds();

  const writes: Write[] = [];
  Object.keys(prices).forEach((id) => {
    const feed = feedsIds.find((feed: any) => feed.id == id);
    if (!feed) return;
    const { symbol } = feed;

    addToDBWritesList(
      writes,
      "pyth",
      symbol,
      prices[id],
      0,
      symbol,
      timestamp,
      "pyth-hermes",
      0.9
    );
  });

  return writes;
}

export const adapters = {
  pythHermes,
  pyth,
}