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
    const db = PGP(process.env.COINS_DB);
    const time = getCurrentUnixTimestamp();

    await db.none(`
      ${PGP.helpers.insert(
        Object.entries(staleCoins).map(([pk, details]) => ({
          id: pk,
          time,
          address: pk.split(":")[1],
          lastupdate: details.lastUpdate,
          chain: pk.split(":")[0],
          symbol: details.symbol,
        })),
        new PGP.helpers.ColumnSet([
          "id",
          "time",
          "address",
          "lastupdate",
          "chain",
          "symbol",
        ]),
        "stalecoins",
      )}
      ON CONFLICT (id) DO UPDATE
        SET time = ${time}
    `);
  } catch (e) {
    console.error("write to postgres failed:");
    console.error(e);
  }
}
