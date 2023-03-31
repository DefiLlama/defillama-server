import { getCurrentUnixTimestamp } from "../utils/date"
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

export async function storeStaleCoins(staleCoins: StaleCoins) {
    const sql = postgres(process.env.COINS_DB!);
    const currentTime = getCurrentUnixTimestamp();
    Object.entries(staleCoins).map(async ([pk, details]) => {
      console.log(`writing to postgres pk: ${pk}...`)
      try {
        await sql`
        INSERT INTO public.stalecoins (id, time, address, lastupdate, chain, symbol)
        VALUES (${pk}, ${currentTime}, ${pk.split(":")[1]}, ${
          details.lastUpdate
        }, ${pk.split(":")[0]}, ${details.symbol})
        ON CONFLICT (id) DO UPDATE
          SET time = ${currentTime}
        `;
      } catch (e) {
        console.log('write to postgres failed')
        console.error(e)
      }
    }
  );
}