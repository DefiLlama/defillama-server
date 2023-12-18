import { multiCall } from "@defillama/sdk/build/abi/abi2";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { fetch } from "../utils";
import { addToDBWritesList } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { Feed, abi, mapping } from "./pythConfig";

const now = getCurrentUnixTimestamp();

async function fetchPrices(feeds: Feed[], timestamp: number) {
  const prices: { [id: string]: number } = {};

  const pricesRes = await multiCall({
    chain: "arbitrum",
    target: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
    calls: feeds.map((f: Feed) => `0x${f.id}`),
    abi,
  });

  pricesRes.map((p: any, i: number) => {
    if (p.publishTime + 300 < timestamp) return; // 5 min latency
    prices[feeds[i].id] = p.price * 10 ** p.expo;
  });

  return prices;
}

async function fetchFeedIds(): Promise<Feed[]> {
  const feedsRes = await fetch(`https://benchmarks.pyth.network/v1/price_feeds/
    `);
  const feeds: Feed[] = [];
  feedsRes.map((r: any) => {
    const ticker = r.attributes.base;
    const keys = mapping[ticker];
    if (keys)
      feeds.push({
        ticker,
        quote: r.attributes.quote_currency,
        id: r.id,
        keys,
      });
  });

  return feeds;
}

export async function pyth(timestamp: number = now) {
  if (timestamp != now) return [];

  const feeds: Feed[] = await fetchFeedIds();

  const prices = await fetchPrices(feeds, timestamp);

  const writes: Write[] = [];
  feeds.map((f: Feed) =>
    f.keys.map((k: string) =>
      addToDBWritesList(
        writes,
        k.split(":")[0],
        k.split(":")[1],
        prices[f.id],
        0,
        f.ticker,
        0,
        "pyth",
        0.8,
      ),
    ),
  );

  return writes;
}
