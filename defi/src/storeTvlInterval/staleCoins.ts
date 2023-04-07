import { getCurrentUnixTimestamp } from "../utils/date";
import pgp from "pg-promise";

export interface StaleCoins {
    [address: string]: {
        symbol: string,
        lastUpdate: number,
    }
}

export function addStaleCoin(staleCoins: StaleCoins, address: string, symbol: string, lastUpdate: number) {
    if (staleCoins[address] === undefined) {
        staleCoins[address] = {
            symbol,
            lastUpdate
        }
    }
}

export async function storeStaleCoins(staleCoins: StaleCoins) {
  try {
    if (!process.env.COINS_DB) return;
    const PGP = pgp();
    const db = PGP(process.env.COINS_DB!);
    const recentlyUpdatedCoins = await readCoins(staleCoins, db);
    const filteredStaleCoins = Object.keys(staleCoins)
      .filter((key) => !recentlyUpdatedCoins.includes(key))
      .reduce((obj: { [id: string]: any }, key) => {
        obj[key] = staleCoins[key];
        return obj;
      }, {});
    await writeCoins(filteredStaleCoins, PGP, db);
  } catch (e) {
    console.error("write to postgres failed:");
    console.error(e);
  }
}

async function readCoins(staleCoins: StaleCoins, db: any): Promise<string[]> {
  const time = getCurrentUnixTimestamp();
  return (
    await db.any(
      `SELECT 
        id, 
        time
      FROM stalecoins
      WHERE id in ($1:csv) and time > ${time - 300}`,
      [Object.keys(staleCoins)],
    )
  ).map((e: any) => e.id);
}

async function writeCoins(
  staleCoins: StaleCoins,
  PGP: any,
  db: any,
): Promise<void> {
  const time = getCurrentUnixTimestamp();

  const insertData = Object.entries(staleCoins).map(([pk, details]) => ({
    id: pk,
    time,
    address: pk.split(":")[1],
    lastupdate: details.lastUpdate,
    chain: pk.split(":")[0],
    symbol: details.symbol,
  }));

  const columnSets = new PGP.helpers.ColumnSet(
    ["id", "time", "address", "lastupdate", "chain", "symbol"],
    { table: "stalecoins" },
  );

  await db.none(
    PGP.helpers.insert(insertData, columnSets) +
      " ON CONFLICT (id) DO UPDATE SET " +
      columnSets.assignColumns({
        from: "EXCLUDED",
        skip: ["id", "address", "chain", "symbol"],
      }),
  );
}
