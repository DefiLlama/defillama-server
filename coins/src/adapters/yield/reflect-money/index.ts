import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import axios from "axios";


type Stablecoin = {
  mintAddress: string;
  symbol: string;
  decimals: number;
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
