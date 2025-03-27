import { getCurrentUnixTimestamp } from "../../utils/date";
import { addToDBWritesList } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { getConfig } from "../../utils/cache";

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

export async function pyth(timestamp: number = now) {
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
