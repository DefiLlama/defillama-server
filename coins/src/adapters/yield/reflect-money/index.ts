import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../../utils/database";
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
};

const stablecoins: Stablecoin[] = [
  {
    mintAddress: "usd63SVWcKqLeyNHpmVhZGYAqfE5RHE8jwqjRA2ida2",
    symbol: "USDC+",
    decimals: 6,    
    chain: "solana",
  },
  {
    mintAddress: "uSDtYeMVYuQwhziLKMpdMz74WPFNytoWLGGiU9SDnZx",
    symbol: "USDT+",
    decimals: 6,    
    chain: "solana",
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

  await Promise.all(stablecoins.map(async (stablecoin: Stablecoin, index: number) => {
    const mintAddress = stablecoin.mintAddress;
    const { data } = await axios.get(`https://prod.api.reflect.money/stablecoin/${index}/exchange-rate`);
    const price = (data.data.base as number) / PRICE_PRECISION;

    addToDBWritesList(
      writes,
      stablecoin.chain,
      mintAddress,
      price,
      stablecoin.decimals,
      stablecoin.symbol,
      timestamp,
      "reflect-money-api",
      0.95
    );
  }));

  return writes;
}
