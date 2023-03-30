import { getCurrentUnixTimestamp } from "../utils/date"
import { executeAndIgnoreErrors } from "./errorDb"
import postgres from "postgres";

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

export function storeStaleCoins(staleCoins: StaleCoins) {
    const currentTime = getCurrentUnixTimestamp()
    return Promise.all(Object.entries(staleCoins).map(([address, details]) => {
        const chain = address.split(':')[0]
        return executeAndIgnoreErrors('INSERT INTO `staleCoins` VALUES (?, ?, ?, ?, ?)', [currentTime, address, details.lastUpdate, chain, details.symbol])
    }))
}

export function storeStaleCoins2(staleCoins: StaleCoins) {
    const sql = postgres(process.env.COINS_DB!);
    const currentTime = getCurrentUnixTimestamp();
    return Promise.all(
      Object.entries(staleCoins).slice(0, 1).map(([pk, details]) => {
        sql`
        INSERT INTO public.stalecoins (id, time, address, lastupdate, chain, symbol)
        VALUES (${pk}, ${currentTime}, ${pk.split(":")[1]}, ${
          details.lastUpdate
        }, ${pk.split(":")[0]}, ${details.symbol})
        ON CONFLICT (id) DO UPDATE
          SET time = ${currentTime}
        `;
      }),
    ).catch((e) => console.log("postgres error", e));
  }