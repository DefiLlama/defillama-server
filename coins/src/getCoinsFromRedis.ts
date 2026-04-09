import { successResponse, wrap, IResponse } from "./utils/shared";
import { redisCurrentPrices, chCurrentPrices, CoinsResponse } from "./utils/servingLayer";

const isFresh = (timestamp: number, searchWidth: number) => {
  if (!timestamp) return true;
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
  const requestedCoins = (event.pathParameters?.coins ?? "").split(",");
  const searchWidth = 12 * 3600; // 12h default

  // Layer 1: Redis
  const redisResult = await redisCurrentPrices(requestedCoins);
  if (redisResult) {
    return successResponse({ coins: filterFresh(redisResult, searchWidth) }, undefined, { Expires: makeExpiry() });
  }

  // Layer 2: ClickHouse
  const chResult = await chCurrentPrices(requestedCoins);
  if (chResult) {
    return successResponse({ coins: filterFresh(chResult, searchWidth) }, undefined, { Expires: makeExpiry() });
  }

  // No data from Redis or CH
  return successResponse({ coins: {} }, undefined, { Expires: makeExpiry() });
};

export default wrap(handler);
