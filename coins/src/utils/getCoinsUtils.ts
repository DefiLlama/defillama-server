import { batchGet } from "./dynamodbV3";
import { coinToPK } from "./processCoin";
import { getCoingeckoLock } from "../utils/shared/coingeckoLocks";
import sleep from "../utils/shared/sleep";
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
  const PKTransforms = {} as { [pk: string]: string };
  const pks: string[] = [];
  requestedCoins.forEach((coin) => {
    const pk = coinToPK(coin);
    PKTransforms[pk] = coin;
    pks.push(pk);
  });
  const coins = await batchGetLatest(pks);
  return { coins, PKTransforms };
}

export async function retryCoingeckoRequest(
  query: string,
  retries: number,
): Promise<CoingeckoResponse> {
  for (let i = 0; i < retries; i++) {
    await getCoingeckoLock();
    try {
      const res = (await fetch(
        `https://pro-api.coingecko.com/api/v3/${query}&x_cg_pro_api_key=${process.env.CG_KEY}`,
      ).then((r) => r.json())) as CoingeckoResponse;
      if (Object.keys(res).length == 1 && Object.keys(res)[0] == "status")
        throw new Error(`cg call failed`);
      return res;
    } catch (e) {
      if ((i + 1) % 3 === 0 && retries > 3) {
        await sleep(10e3); // 10s
      }
      continue;
    }
  }
  return {};
}

export async function fetchCgPriceData(coinIds: string[]) {
  return await retryCoingeckoRequest(
    `simple/price?ids=${coinIds.join(
      ",",
    )}&vs_currencies=usd&include_market_cap=true&include_last_updated_at=true&include_24hr_vol=true`,
    10,
  );
}
