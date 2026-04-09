import { successResponse, wrap, IResponse } from "./utils/shared";
import { redisCurrentPrices, chCurrentPrices, CoinsResponse } from "./utils/servingLayer";

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
 * Reads from Redis → ClickHouse fallback. Does not touch DDB.
 * Meant to be routed separately from the existing DDB-based getCurrentCoins handler.
 */
const handler = async (event: any): Promise<IResponse> => {
  const requestedCoins = (event.pathParameters?.coins ?? "").split(",").filter(Boolean);
  if (requestedCoins.length === 0) return successResponse({ coins: {} });
  const rawWidth = event.queryStringParameters?.searchWidth?.toLowerCase() ?? "12h";
  const hours = parseInt(rawWidth) || 12;
  const searchWidth = hours * 3600;

  // Layer 1: Redis
  const redisResult = await redisCurrentPrices(requestedCoins);
  if (redisResult) {
    const fresh = filterFresh(redisResult, searchWidth);
    if (Object.keys(fresh).length > 0) {
      return successResponse({ coins: fresh }, undefined, { Expires: makeExpiry() });
    }
  }

  // Layer 2: ClickHouse (fallback if Redis miss or all stale)
  const chResult = await chCurrentPrices(requestedCoins);
  if (chResult) {
    const fresh = filterFresh(chResult, searchWidth);
    if (Object.keys(fresh).length > 0) {
      return successResponse({ coins: fresh }, undefined, { Expires: makeExpiry() });
    }
  }

  // No fresh data from Redis or CH
  return successResponse({ coins: {} }, undefined, { Expires: makeExpiry() });
};

export default wrap(handler);
