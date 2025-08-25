import { batchGet } from "./shared/dynamodb";
import { coinToPK } from "./processCoin";
import { getCoingeckoLock } from "../utils/shared/coingeckoLocks";
import sleep from "../utils/shared/sleep";
import fetch from "node-fetch";
console.log("imports done");

export type CoinsResponse = {
  [coin: string]: {
    decimals?: number;
    price: number;
    timestamp: number;
    symbol: string;
    confidence?: number;
  };
};

interface CoingeckoResponse {
  [cgId: string]: {
    usd: number;
    usd_market_cap: number;
    last_updated_at: number;
    usd_24h_vol: number;
  };
}

export const batchGetLatest = (pks: string[]) =>
  batchGet(
    pks.map((pk) => ({
      PK: pk,
      SK: 0,
    })),
  );

export async function getBasicCoins(requestedCoins: string[]) {
  const PKTransforms = {} as { [pk: string]: string[] };
  const pks: string[] = [];
  requestedCoins.forEach((coin) => {
    const pk = coinToPK(coin);
    (PKTransforms[pk]) ? PKTransforms[pk].push(coin) : PKTransforms[pk] = [coin]
    pks.push(pk);
  });
  const coins = await batchGetLatest(pks);
  return { coins, PKTransforms };
}

export async function retryCoingeckoRequest(
  query: string,
  retries: number,
  log: boolean = false,
): Promise<CoingeckoResponse> {
  for (let i = 0; i < retries; i++) {
    await getCoingeckoLock();
    try {
      const fetched = await fetch(
        `https://pro-api.coingecko.com/api/v3/${query}&x_cg_pro_api_key=${process.env.CG_KEY}`,
      ).catch((e: any) => {
        throw e.message
      });
      if (log) console.log(fetched);
      const res = (await fetched.json()) as CoingeckoResponse;
      if (log) console.log(res);
      if (Object.keys(res).length == 1 && Object.keys(res)[0] == "status")
        throw new Error(`cg call failed`);
      return res;
    } catch (e) {
      if (log) console.log(e);
      if ((i + 1) % 3 === 0 && retries > 3) {
        await sleep(10e3); // 10s
      }
      continue;
    }
  }
  return {};
}

export async function fetchCgPriceData(
  coinIds: string[],
  log: boolean = false,
) {
  return await retryCoingeckoRequest(
    `simple/price?ids=${coinIds.join(
      ",",
    )}&vs_currencies=usd&include_market_cap=true&include_last_updated_at=true&include_24hr_vol=true`,
    10,
    log,
  );
}
