import { queryPostgresWithRetry } from "../../coins2";
import { getCoins2Connection } from "../../getDBConnection";

export async function storeMissingCoins(
  missingCoins: { chain: string; address: string }[],
) {
  if (!missingCoins.length) return;
  const sql = await getCoins2Connection();

  const coins: { chain: string; address: string; hasbeenchecked: boolean }[] =
    missingCoins.map((coin) => ({
      hasbeenchecked: false,
      ...coin,
    }));

  await queryPostgresWithRetry(
    sql`
    insert into unsupportedkeys
    ${sql(coins, "chain", "address", "hasbeenchecked")}
    on conflict (chain, address)
    do nothing
  `,
    sql,
  );
}
