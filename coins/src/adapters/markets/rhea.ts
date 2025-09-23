import { addToDBWritesList } from "../utils/database";
import { Write } from "../utils/dbInterfaces";

export async function rhea(timestamp: number) {
  if (timestamp != 0) throw new Error("Rhea is only for current price");

  const res = await fetch("https://indexer.ref.finance/list-token-price").then(
    (r) => r.json(),
  );

  const writes: Write[] = [];
  Object.keys(res).map((key) => {
    const { price, decimal, symbol } = res[key];
    if (!price || !decimal || !symbol) return;

    addToDBWritesList(
      writes,
      "near",
      key,
      price,
      decimal,
      symbol,
      timestamp,
      "rhea",
      0.7,
    );
  });

  return writes;
}
