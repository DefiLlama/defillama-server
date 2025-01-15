import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import { getConnection } from "./utils";
import { PublicKey } from "@solana/web3.js";
import { KaminoMarket } from "@kamino-finance/klend-sdk";

const markets: string[] = [
  "DxXdAyU3kCjnyggvHmY5nAwg5cRbbmdyX3npfDMjjMek",
  "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
];

export async function kamino(timestamp: number) {
  if (timestamp != 0) throw new Error(`Kamino adapter only works for current`);

  const connection = getConnection();
  const reserves: any[] = [];
  await Promise.all(
    markets.map((m) =>
      KaminoMarket.load(connection, new PublicKey(m), 60000).then((r) => {
        if (r) reserves.push(...r.reserves);
      }),
    ),
  );

  const writes: Write[] = [];
  for (let [_, v] of reserves) {
    const { price, decimals } = v.tokenOraclePrice;
    const token = v.state.collateral.mintPubkey.toString();

    addToDBWritesList(
      writes,
      "solana",
      token,
      Number(price),
      decimals.e,
      `Kamino Reserve Collateral (${v.symbol}) Token`,
      timestamp,
      "kamino",
      0.8,
    );
  }

  return writes;
}
