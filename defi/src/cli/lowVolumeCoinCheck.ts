import { getLatestProtocolItems, initializeTVLCacheDB } from "../api2/db";
import { getCurrentUnixTimestamp } from "../utils/date";
import { dailyUsdTokensTvl } from "../utils/getLastRecord";
import { getR2JSONString } from "../utils/r2";

const usdThreshold = 1e6; // 1M USD
const volumeThreshold = 1e4; // 10k USD
const cacheFile = "symbol-volumes.json";
const margin = 2 * 60 * 60; // 1 hour

async function main() {
  await initializeTVLCacheDB();
  const volumeData: { [symbol: string]: number } = await getR2JSONString(cacheFile);

  if (!volumeData.cacheTimestamp || volumeData.cacheTimestamp < getCurrentUnixTimestamp() - margin) {
    console.log("cache is stale, skipping");
    return;
  }

  const protocols = (await getLatestProtocolItems(dailyUsdTokensTvl)) as {
    id: string;
    data: { tvl: { [symbol: string]: number } };
  }[];

  protocols.map(({ id, data }) => {
    if (!data.tvl) return;
    Object.keys(data.tvl).map((symbol) => {
      if (volumeData[symbol] && volumeData[symbol] < volumeThreshold && data.tvl[symbol] > usdThreshold) {
        let a = volumeData[symbol];
        let b = data.tvl[symbol];
        console.log(
          `project id ${id} has ${(data.tvl[symbol] / 1e6).toFixed(2)}M$ TVL of ${symbol}, but only ${(
            volumeData[symbol] / 1e3
          ).toFixed(2)}k$ volume`
        );
      }
    });
  });
}

main(); // ts-node defi/src/cli/lowVolumeCoinCheck.ts
