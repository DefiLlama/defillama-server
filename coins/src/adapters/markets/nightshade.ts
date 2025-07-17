import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import axios from "axios";

export function nightshade(timestamp: number) {
  const THIRY_MINUTES = 1800;
  if (+timestamp !== 0 && timestamp < +new Date() / 1e3 - THIRY_MINUTES)
    throw new Error("Can't fetch historical data");

  return Promise.all([getTokenPrices(timestamp)]);
}

async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  const { data: assets } = await axios.get(
    "https://nightshade.finance/api/defillama-token-list?verified=true",
  );

  assets.forEach(({ id, slug, decimals, priceUsd }: any) =>
    addToDBWritesList(
      writes,
      "alephium",
      id,
      priceUsd,
      decimals,
      slug,
      timestamp,
      "nightshade",
      0.9,
    ),
  );

  return writes;
}
