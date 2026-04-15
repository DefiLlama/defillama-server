import type { PlatformAdapter, FundingEntry, ParsedPerpsMarket } from "./types";
import { safeFloat, safeFetch } from "./types";
import { fetchPythPricesByFeedId } from "./pyth";
import { applyOstiumFallbackPrices } from "./pyth";

// Avantis — Base
// Docs: https://sdk.avantisfi.com/introduction.html
// Socket API: https://socket-api-pub.avantisfi.com/socket-api/v1/data
// RWA assets: 14+ (equities, commodities)
// Margin: USDC | Oracle: Pyth

export const AVANTIS_MAKER_FEE = 0.0006;
export const AVANTIS_TAKER_FEE = 0.0008;

const AVANTIS_SOCKET_API = "https://socket-api-pub.avantisfi.com/socket-api/v1/data";

// ---------------------------------------------------------------------------
// Raw API types (from socket-api /data endpoint)
// ---------------------------------------------------------------------------

interface AvantisPairInfo {
  from: string;
  to: string;
  index: number;
  groupIndex: number;
  openInterest: { long: number; short: number };
  pairOI: number;
  pairMaxOI: number;
  leverages: { minLeverage: number; maxLeverage: number };
  openFeeP: number;
  closeFeeP: number;
  spreadP: number;
  isPairListed: boolean;
  feed?: {
    feedId?: string;
    attributes?: { symbol?: string; isOpen?: boolean };
  };
}

interface AvantisSocketResponse {
  data: {
    pairCount: number;
    totalOi: number;
    groupInfo: { [idx: string]: { name: string; groupMaxOI: number; groupOI: number } };
    pairInfos: { [idx: string]: AvantisPairInfo };
  };
}

// RWA groups: 3 = COMMODITIES, 6 = EQUITIES
const RWA_GROUP_INDICES = new Set([3, 6]);

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchAvantisData(): Promise<AvantisSocketResponse | null> {
  return safeFetch<AvantisSocketResponse>(AVANTIS_SOCKET_API, "Avantis fetchData");
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseAvantisMarkets(
  resp: AvantisSocketResponse,
  pythPrices: Map<string, number>,
): ParsedPerpsMarket[] {
  const markets: ParsedPerpsMarket[] = [];
  const pairInfos = resp.data?.pairInfos;
  if (!pairInfos) return markets;

  for (const [, pair] of Object.entries(pairInfos)) {
    if (!RWA_GROUP_INDICES.has(pair.groupIndex)) continue;
    if (!pair.isPairListed) continue;

    const contract = `avantis:${pair.from}-${pair.to}`;

    const oiLong = safeFloat(pair.openInterest?.long);
    const oiShort = safeFloat(pair.openInterest?.short);
    const openInterest = oiLong + oiShort;

    // Price from Pyth Hermes via the pair's feed ID
    const feedId = pair.feed?.feedId ?? "";
    const price = pythPrices.get(feedId) ?? 0;

    markets.push({
      contract,
      venue: "avantis",
      platform: "avantis",
      openInterest,
      volume24h: 0, // Not available from socket API; requires Dune/on-chain data
      markPx: price,
      oraclePx: price,
      midPx: price,
      prevDayPx: 0,
      priceChange24h: 0,
      fundingRate: 0,
      premium: 0,
      maxLeverage: pair.leverages?.maxLeverage ?? 0,
      szDecimals: 0,
    });
  }

  return markets;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const avantisAdapter: PlatformAdapter = {
  name: "avantis",
  oiIsNotional: true, // OI is USD notional
  async fetchMarkets(): Promise<ParsedPerpsMarket[]> {
    const data = await fetchAvantisData();
    if (!data?.data?.pairInfos) return [];

    // Collect Pyth feed IDs from RWA pairs
    const feedIds: string[] = [];
    for (const pair of Object.values(data.data.pairInfos)) {
      if (!RWA_GROUP_INDICES.has(pair.groupIndex) || !pair.isPairListed) continue;
      if (pair.feed?.feedId) feedIds.push(pair.feed.feedId);
    }

    const pythPrices = await fetchPythPricesByFeedId(feedIds);
    const markets = parseAvantisMarkets(data, pythPrices);

    // Fallback: for markets still missing prices, try Ostium's live price feed
    await applyOstiumFallbackPrices(markets);

    return markets;
  },
  async fetchFundingHistory(): Promise<FundingEntry[]> {
    return [];
  },
};
