import { successResponse, wrap, IResponse } from "./utils/shared";
import { redisCurrentPrices, chCurrentPrices, CoinsResponse } from "./utils/servingLayer";
import { quantisePeriod } from "./utils/timestampUtils";

const isFresh = (timestamp: number, searchWidth: number) => {
  if (!timestamp || timestamp <= 0) return false;
  return (Date.now() / 1e3) - timestamp < searchWidth;
};

function makeExpiry(): string {
  const date = new Date();
  const minutes = date.getMinutes();
  date.setMinutes(minutes + 5 - (minutes % 5));
  date.setSeconds(20);
  return date.toUTCString();
}

function filterFresh(result: CoinsResponse, searchWidth: number): CoinsResponse {
  const filtered: CoinsResponse = {};
  for (const [coin, data] of Object.entries(result)) {
    if (isFresh(data.timestamp, searchWidth)) filtered[coin] = data;
  }
  return filtered;
}

/**
 * Independent serving handler for current coin prices.
 * Reads fresh prices from Redis first, then fills missing coins from ClickHouse.
 * Does not touch DDB.
 * Meant to be routed separately from the existing DDB-based getCurrentCoins handler.
 */
const handler = async (event: any): Promise<IResponse> => {
  const requestedCoins = (event.pathParameters?.coins ?? "").split(",").filter(Boolean);
  if (requestedCoins.length === 0) return successResponse({ coins: {} });
  const rawWidth = event.queryStringParameters?.searchWidth?.toLowerCase() ?? "12h";
  const searchWidth = quantisePeriod(rawWidth);

  // Layer 1: Redis
  const redisResult = await redisCurrentPrices(requestedCoins);
  const redisFresh = redisResult ? filterFresh(redisResult, searchWidth) : {};

  // Layer 2: ClickHouse for any coins Redis didn't cover
  const missingCoins = requestedCoins.filter((c: string) => !redisFresh[c]);
  let chFresh: CoinsResponse = {};
  if (missingCoins.length > 0) {
    const chResult = await chCurrentPrices(missingCoins);
    if (chResult) chFresh = filterFresh(chResult, searchWidth);
  }

  const merged = { ...redisFresh, ...chFresh };
  return successResponse({ coins: merged }, undefined, { Expires: makeExpiry() });
};

export default wrap(handler);
