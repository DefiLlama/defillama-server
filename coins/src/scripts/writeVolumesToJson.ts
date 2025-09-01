import { getCurrentUnixTimestamp } from "../utils/date";
import { getR2JSONString, storeR2JSONString } from "../utils/r2";

const cacheFile = "symbol-volumes.json";
const margin = 1 * 60 * 60; // 1 hour

export async function writeVolumesToJson(data: { [symbol: string]: number }) {
  const now = getCurrentUnixTimestamp();
  const currentCache = await getR2JSONString(cacheFile);

  let records: { [symbol: string]: number } =
    currentCache.cacheTimestamp < now - margin
      ? { cacheTimestamp: now }
      : currentCache ?? { cacheTimestamp: now };

  Object.keys(data).forEach((symbol) => {
    if (records[symbol] > data[symbol]) return;
    records[symbol] = data[symbol];
  });

  await storeR2JSONString(cacheFile, JSON.stringify(records), 60 * 60);
}

// fine after 100 => 10 => 1 M$
