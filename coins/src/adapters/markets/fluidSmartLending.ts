import { addToDBWritesList } from "../utils/database";
import { Write } from "../utils/dbInterfaces";

export async function fluidSmartLending(timestamp: number = 0) {
  if (timestamp != 0)
    throw new Error("fluidSmartLending must run at timestamp = 0");

  const res = await fetch(
    `https://api.fluid.instadapp.io/v2/smart-lending/1/tokens`,
  ).then((res) => res.json());

  const writes: Write[] = [];
  res.map(
    ({
      address,
      decimals,
      symbol,
      tokens: { token0, token1 },
      totalSupply,
      totalUnderlyingAssetsToken0,
      totalUnderlyingAssetsToken1,
    }: any) => {
      const aum0 =
        (totalUnderlyingAssetsToken0 * token0.price) / 10 ** token0.decimals;
      const aum1 =
        (totalUnderlyingAssetsToken1 * token1.price) / 10 ** token1.decimals;
      const price = ((aum0 + aum1) * 10 ** decimals) / totalSupply;
      addToDBWritesList(
        writes,
        "ethereum",
        address,
        price,
        decimals,
        symbol,
        timestamp,
        "fluidSmartLending",
        1,
      );
    },
  );

  return writes;
}

fluidSmartLending(); // ts-node coins/src/adapters/markets/fluidSmartLending.ts
