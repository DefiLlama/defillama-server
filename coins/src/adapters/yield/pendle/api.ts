import fetch from "node-fetch";
import { Write } from "../../utils/dbInterfaces";
import { addToDBWritesList } from "../../utils/database";
import { chainIdMap } from "../../bridges/celer";

type Asset = {
  chainId: number;
  address: string;
  decimals: number;
  symbol: string;
  price: number;
};

export async function getApiPrices(timestamp: number) {
  if (timestamp != 0) return;
  const res = await fetch(
    `https://api-v2.pendle.finance/bff/v2/assets/all`,
  ).then((r) => r.json());

  const assets: Asset[] = res.results;
  const writes: Write[] = [];

  assets.map(({ chainId, address, decimals, symbol, price }: Asset) => {
    if (!chainId || !address || !decimals || !symbol || !price) return;

    addToDBWritesList(
      writes,
      chainIdMap[chainId],
      address,
      price,
      decimals,
      symbol,
      timestamp,
      "pendle-api",
      0.5,
    );
  });

  return writes;
}
