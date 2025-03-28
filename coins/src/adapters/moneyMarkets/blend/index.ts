import { Write } from "../../utils/dbInterfaces";
import { addToDBWritesList } from "../../utils/database";

// Add global error handler
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

async function withRetries<T>(
  fn: () => Promise<T>,
  maxAttempts: number
): Promise<T> {
  let attempts = 0;
  let lastError: Error | undefined;

  while (attempts < maxAttempts) {
    try {
      console.log(`Attempt ${attempts + 1}`);
      return await fn();
    } catch (error) {
      console.error(`Attempt ${attempts + 1} failed:`, error);
      lastError = error as Error;
      attempts++;
      if (attempts < maxAttempts)
        await new Promise((r) => setTimeout(r, 1000 * attempts));
    }
  }
  throw (
    lastError ?? new Error("All attempts failed without capturing an error")
  );
}

// 1. Configuration (Edit these only)
const CONFIG = {
  BLEND_CONTRACT: "0x526e8a66e357ffeaeeec6d7be1e5ea44a788dd1d",
  COINGECKO_ID: "blend-3",
  DECIMALS: 18,
  MEXC_PAIR: "blend_usdt",
  MIN_PRICE: 0.000001, // Reject if price < $0.0001
  MAX_PRICE: 1000, // Reject if price > $1000
};

// 2. Rate limit tracker
let lastCallTime = 0;
const RATE_LIMIT_MS = 6000; // CoinGecko free tier: 10 req/min

export async function projectBlend(timestamp: number = 0) {
  const writes: Write[] = [];

  // 3. Fetch with retries
  const priceData = await withRetries(
    () => fetchCoinGeckoPrice(CONFIG.COINGECKO_ID, CONFIG.MEXC_PAIR),
    3 // Max retries
  );

  // 4. Price validation
  validatePrice(priceData);

  // 5. Add to DefiLlama
  addToDBWritesList(
    writes,
    "educhain",
    CONFIG.BLEND_CONTRACT,
    priceData.price,
    CONFIG.DECIMALS,
    "Blend",
    timestamp,
    "Blend",
    0.8
  );

  return writes;
}

// --- Core Functions --- //
async function fetchCoinGeckoPrice(coingeckoId: string, exchangePair: string) {
  console.log("Fetching CoinGecko price");
  // Rate limit control
  const now = Date.now();
  const waitTime = RATE_LIMIT_MS - (now - lastCallTime);
  if (waitTime > 0) await new Promise((r) => setTimeout(r, waitTime));
  lastCallTime = Date.now();

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd&include_exchange_volumes=true`;
  const response = await fetch(url);

  if (!response.ok) throw new Error(`CoinGecko API: ${response.status}`);
  const data = await response.json();
  if (!data[coingeckoId]?.usd) throw new Error("Missing price data");

  return {
    price: data[coingeckoId].usd,
    volume: data[coingeckoId][`${exchangePair}_24h_vol`] || 0,
  };
}

function validatePrice(data: { price: number; volume: number }) {
  console.log("Validating price:", data);
  if (data.price < CONFIG.MIN_PRICE || data.price > CONFIG.MAX_PRICE) {
    throw new Error(`Invalid price: $${data.price}`);
  }
}
