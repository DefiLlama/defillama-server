import { getCurrentUnixTimestamp } from "../utils/date";
import pgp from "pg-promise";
import { sendMessage } from "../utils/discord";
import setEnvSecrets from "../utils/shared/setEnvSecrets";

export interface StaleCoins {
  [address: string]: {
    symbol: string;
    lastUpdate: number;
  };
}

const PGP = pgp();
let db: any = null;

export function addStaleCoin(
  staleCoins: StaleCoins,
  address: string,
  symbol: string,
  lastUpdate: number,
) {
  if (staleCoins[address] === undefined) {
    staleCoins[address] = {
      symbol,
      lastUpdate,
    };
  }
}

export async function storeStaleCoins(staleCoins: StaleCoins) {
  await setEnvSecrets()
  const webhookUrl = process.env.STALE_COINS_ADAPTERS_WEBHOOK!;
  sendMessage(`allStaleCoins.length: ${Object.keys(staleCoins).length}`, webhookUrl, true)
  try {
    if (!process.env.COINS_DB) {
      sendMessage(`!COINS_DB`, webhookUrl, true)
      return
    };
    if (Object.keys(staleCoins).length == 0) {
      sendMessage(`!staleCoins.length`, webhookUrl, true)
      return;
    }
    if (db == null) db = PGP(process.env.COINS_DB!);
    const recentlyUpdatedCoins = await readCoins(staleCoins, db);
    const filteredStaleCoins = Object.keys(staleCoins)
      .filter((key) => !recentlyUpdatedCoins.includes(key))
      .reduce((obj: { [id: string]: any }, key) => {
        obj[key] = staleCoins[key];
        return obj;
      }, {});
    if (Object.keys(filteredStaleCoins).length == 0) {
      sendMessage(`!filteredStaleCoins.length`, webhookUrl, true)
      return;
    }
    sendMessage(`writing filtered stale coins..`, webhookUrl, true)
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
      WHERE id IN ($1:csv) AND time > ${time - 1200}`,
      [Object.keys(staleCoins).map((c: string) => c.toLowerCase())],
    )
  ).map((e: any) => e.id);
}

async function writeCoins(
  staleCoins: StaleCoins,
  PGP: any,
  db: any,
): Promise<void> {
  const time = getCurrentUnixTimestamp();

  const insertData = Object.entries(staleCoins)
    .map(([pk, details]) => ({
      id: pk,
      time,
      address: pk.split(":")[1],
      lastupdate: details.lastUpdate,
      chain: pk.split(":")[0],
      symbol: details.symbol,
    }))
    .filter((c: any) => c.lastupdate > time - 3600 * 24);
  if(insertData.length === 0){
    return;
  }

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
