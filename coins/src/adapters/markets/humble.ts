import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import axios from "axios";

const chain = "voi";
const MIN_TVL = 3_000;

interface TokenStat {
  assetId: string;
  token: {
    assetId: string;
    name: string;
    unitName: string;
    decimals: number;
  };
  price: {
    usd: string;
  };
  liquidity: {
    totalUSD: string;
  };
}

export async function humble(timestamp: number) {
  if (timestamp !== 0) throw new Error("Can't fetch historical data");

  const writes: Write[] = [];
  const { data } = await axios.get(
    "https://humble-api.voi.nautilus.sh/tokens/stats?sortBy=tvl",
  );

  const stats: TokenStat[] = data.stats ?? [];

  for (const entry of stats) {
    const tvl = parseFloat(entry.liquidity.totalUSD);
    if (!tvl || tvl < MIN_TVL) continue;

    const price = parseFloat(entry.price.usd);
    if (!price || price <= 0) continue;

    const { assetId, unitName, decimals } = entry.token;
    if (!unitName) continue;

    addToDBWritesList(
      writes,
      chain,
      assetId,
      price,
      decimals,
      unitName,
      timestamp,
      "humble",
      0.9,
    );
  }

  return writes;
}
