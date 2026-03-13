import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import axios from "axios";


/** Represents a Reflect Money stablecoin with its on-chain metadata. */
type Stablecoin = {
  /** The on-chain mint address of the token. */
  mintAddress: string;
  /** The ticker symbol of the token (e.g. "USDC+"). */
  symbol: string;
  /** The number of decimal places used by the token. */
  decimals: number;
  /** The chain the token is deployed on (e.g. "solana"). */
  chain: string;
  /** Index used by the Reflect Money API for this stablecoin. */
  apiIndex: number;
};

const stablecoins: Stablecoin[] = [
  {
    mintAddress: "usd63SVWcKqLeyNHpmVhZGYAqfE5RHE8jwqjRA2ida2",
    symbol: "USDC+",
    decimals: 6,    
    chain: "solana",
    apiIndex: 0,
  },
  {
    mintAddress: "uSDtYeMVYuQwhziLKMpdMz74WPFNytoWLGGiU9SDnZx",
    symbol: "USDT+",
    decimals: 6,    
    chain: "solana",
    apiIndex: 1,
  },
];

const PRICE_PRECISION = 1e9;

/**
 * Fetches current exchange rates for Reflect Money stablecoins (USDC+, USDT+)
 * from the Reflect Money API and returns price write objects for the DefiLlama
 * coins database.
 *
 * @param timestamp - Unix timestamp of the data point; pass 0 (default) for the current price.
 * @returns A list of Write objects to be stored, or an empty array if a historical timestamp is requested.
 */
export async function reflectMoney(timestamp: number = 0): Promise<Write[]> {
  if (timestamp != 0) return [];
  const writes: Write[] = [];

  await Promise.all(
    stablecoins.map(async (stablecoin: Stablecoin) => {
      try {
        const { data } = await axios.get(
          `https://prod.api.reflect.money/stablecoin/${stablecoin.apiIndex}/exchange-rate`,
          { timeout: 10_000 },
        );

        const rawBase = data?.data?.base;
        const base = Number(rawBase);
        if (!Number.isFinite(base) || base <= 0) {
          throw new Error(`Invalid exchange-rate payload for ${stablecoin.symbol}: ${JSON.stringify(data)}`);
        }
        const price = base / PRICE_PRECISION;

        addToDBWritesList(
          writes,
          stablecoin.chain,
          stablecoin.mintAddress,
          price,
          stablecoin.decimals,
          stablecoin.symbol,
          timestamp,
          "reflect-money-api",
          0.95,
        );
      } catch (e) {
        console.error(`Failed to fetch price for ${stablecoin.symbol}:`, e);
      }
    }),
  );

  return writes;
}
