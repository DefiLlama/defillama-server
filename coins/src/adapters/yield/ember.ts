import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import axios from "axios";
import { getTokenInfo } from "../utils/sui";
import { runInPromisePool } from "@defillama/sdk/build/util";

export async function ember(timestamp: number) {
  if (timestamp != 0) throw new Error("Ember is only for current price");
  const res = await axios.get(
    "https://vaults.api.sui-prod.bluefin.io/api/v1/vaults/coins/price"
  );
  const writes: Write[] = [];

  await runInPromisePool({
    items: res.data,
    concurrency: 5,
    processor: async (m: any) => {
      const { decimals, symbol } = await getTokenInfo(m.coinType);
      addToDBWritesList(
        writes,
        "sui",
        m.coinType,
        m.priceE9 / 1e9,
        Number(decimals),
        symbol,
        timestamp,
        "ember",
        0.9
      );
    },
  });

  return writes;
}