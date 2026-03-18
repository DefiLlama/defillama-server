import { Write } from "../utils/dbInterfaces";
import axios from "axios";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { runInPromisePool } from "@defillama/sdk/build/util";
import { getTokenInfo } from "../utils/sui";

export async function suirewards(timestamp: number) {
  if (timestamp != 0) throw new Error("Can't fetch historical data");
  const writes: Write[] = [];

  const { data }: any = await axios.get(
    "https://api.suirewards.me/api/tickers"
  );

  const baseCurrencyPrices = await getTokenAndRedirectDataMap(
    data.map(({ base_currency }: any) => base_currency),
    "sui",
    timestamp
  );

  const tokenInfos: { [key: string]: { decimals: number; symbol: string } } =
    {};
  await runInPromisePool({
    items: data.map(({ target_currency }: any) => target_currency),
    concurrency: 5,
    processor: async (target_currency: string) => {
      try {
        const info = await getTokenInfo(target_currency);
        tokenInfos[target_currency] = info;
      } catch (e) {
        console.error(`Error getting token info for ${target_currency}: ${e}`);
      }
    },
  });

  data.map(
    ({
      base_currency,
      target_currency,
      liquidity_in_usd,
      volume_in_usd,
      last_price,
    }: any) => {
      if (!baseCurrencyPrices[base_currency.toLowerCase()]) return;
      if (liquidity_in_usd < 10000 || volume_in_usd < 1000) return;
      const { decimals, symbol } = tokenInfos[target_currency];
      if (!decimals || !symbol) return;

      addToDBWritesList(
        writes,
        "sui",
        target_currency,
        last_price,
        decimals,
        symbol,
        timestamp,
        "suirewards",
        0.9
      );
    }
  );

  return writes;
}
