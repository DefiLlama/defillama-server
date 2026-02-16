import { getRedis } from "./coins3/redis";

const ACTIVE_CG_KEYS_SET = "active_coingecko_keys";
const KEY_EXPIRY_SECONDS = 4 * 60 * 60; // 4 hours

/**
 * Adds a CoinGecko key to the active keys set with 4-hour expiry.
 * This indicates the key has fresh price data from CoinGecko.
 *
 * @param coingeckoId - The CoinGecko ID (without 'coingecko#' prefix)
 */
export async function addActiveCoinGeckoKey(coingeckoId: string): Promise<void> {
  try {
    const redis = getRedis();
    const key = `active_cg:${coingeckoId}`;
    await redis.setex(key, KEY_EXPIRY_SECONDS, "1");
  } catch (error) {
    console.error(`Error adding active CoinGecko key ${coingeckoId}:`, error);
  }
}

/**
 * Adds multiple CoinGecko keys to the active keys set with 4-hour expiry.
 *
 * @param coingeckoIds - Array of CoinGecko IDs (without 'coingecko#' prefix)
 */
export async function addActiveCoinGeckoKeys(coingeckoIds: string[]): Promise<void> {
  if (coingeckoIds.length === 0) return;

  try {
    const redis = getRedis();
    const pipeline = redis.pipeline();

    for (const coingeckoId of coingeckoIds) {
      const key = `active_cg:${coingeckoId}`;
      pipeline.setex(key, KEY_EXPIRY_SECONDS, "1");
    }

    await pipeline.exec();
  } catch (error) {
    console.error(`Error adding active CoinGecko keys:`, error);
  }
}

/**
 * Checks if a CoinGecko key is in the active keys set (has fresh data).
 *
 * @param coingeckoId - The CoinGecko ID (without 'coingecko#' prefix)
 * @returns true if the key is active (fresh), false otherwise
 */
export async function isCoinGeckoKeyActive(coingeckoId: string): Promise<boolean> {
  try {
    const redis = getRedis();
    const key = `active_cg:${coingeckoId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`Error checking CoinGecko key ${coingeckoId}:`, error);
    return false; // Default to false on error (assume stale)
  }
}

/**
 * Checks multiple CoinGecko keys for activity status.
 *
 * @param coingeckoIds - Array of CoinGecko IDs (without 'coingecko#' prefix)
 * @returns Map of coingeckoId -> isActive boolean
 */
export async function areCoinGeckoKeysActive(
  coingeckoIds: string[]
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (coingeckoIds.length === 0) return result;

  try {
    const redis = getRedis();
    const keys = coingeckoIds.map(id => `active_cg:${id}`);

    // We need to check each key individually
    const pipeline = redis.pipeline();
    for (const key of keys) {
      pipeline.exists(key);
    }

    const results = await pipeline.exec();

    coingeckoIds.forEach((id, index) => {
      const [err, value] = results![index];
      result.set(id, !err && value === 1);
    });

    return result;
  } catch (error) {
    console.error(`Error checking multiple CoinGecko keys:`, error);
    // Default all to false on error (assume stale)
    coingeckoIds.forEach(id => result.set(id, false));
    return result;
  }
}
