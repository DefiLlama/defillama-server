import * as sdk from "@defillama/sdk";
import type { CexVolumeResult } from "../../../dimension-adapters/helpers/cex";

export type FirstPartyData = { spotVolume: number; derivVolume: number; oi: number };

function toFirstPartyData(result: CexVolumeResult): FirstPartyData {
  return { spotVolume: result.dailySpotVolume, derivVolume: result.dailyDerivativesVolume, oi: result.openInterest };
}

async function fetchExchange(fetchFn: keyof typeof import("../../../dimension-adapters/helpers/cex")): Promise<FirstPartyData> {
  const mod = await import("../../../dimension-adapters/helpers/cex");
  const result = await (mod[fetchFn] as () => Promise<CexVolumeResult>)();
  return toFirstPartyData(result);
}

// Maps CEX name (as used in cexsData) to its exchange API fetcher.
// To add a new exchange, add an entry here pointing to the corresponding
// function name in dimension-adapters/helpers/cex.ts.
const FIRST_PARTY_EXCHANGES: Record<string, Parameters<typeof fetchExchange>[0]> = {
  "Binance": "fetchBinance",
  "Bybit": "fetchBybit",
  "OKX": "fetchOkx",
};

/**
 * Fetch volume and OI directly from exchange APIs for supported CEXes.
 * Results are cached via sdk.cache to avoid redundant calls within the
 * cron interval.
 */
export async function fetchAllFirstPartyData(isTESTMode: boolean): Promise<Record<string, FirstPartyData>> {
  const cacheKey = "cex/first-party-data";
  const cached = await sdk.cache.readExpiringJsonCache(cacheKey).catch(() => null);
  if (cached) return cached as Record<string, FirstPartyData>;

  const results: Record<string, FirstPartyData> = {};
  const entries = Object.entries(FIRST_PARTY_EXCHANGES);
  const settled = await Promise.allSettled(entries.map(([, fn]) => fetchExchange(fn)));

  settled.forEach((result, i) => {
    const name = entries[i][0];
    if (result.status === "fulfilled") {
      results[name] = result.value;
      if (isTESTMode)
        console.log(`CEX first-party data for ${name}: spot=$${(result.value.spotVolume / 1e9).toFixed(2)}B, deriv=$${(result.value.derivVolume / 1e9).toFixed(2)}B, oi=$${(result.value.oi / 1e9).toFixed(2)}B`);
    } else {
      console.warn(`CEX first-party fetch failed for ${name}: ${result.reason}`);
    }
  });

  await sdk.cache.writeExpiringJsonCache(cacheKey, results, { expireAfter: 10 * 60 * 1000 }); // cache for 10 min
  return results;
}
