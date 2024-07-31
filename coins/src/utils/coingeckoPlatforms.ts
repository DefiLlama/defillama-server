import chainToCoingeckoId from "../../../common/chainToCoingeckoId";
import ddb from "./shared/dynamodb";

interface StringObject {
  [id: string]: string | undefined;
}
export const platformMap = Object.entries(chainToCoingeckoId).reduce(
  (o: any, i) => {
    o[i[1]] = i[0];
    return o;
  },
  {},
) as StringObject;

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  platforms: {
    [network: string]: string;
  };
}
export interface CoinMetadata {
  id: string;
  coinType: string;
  usd: number;
  usd_market_cap: number;
  usd_24h_vol: number;
  last_updated_at: number;
}

function lowercase(address: string, chain: string) {
  return chain === "solana" ? address : address.toLowerCase();
}

export async function iterateOverPlatforms(
  coin: Coin,
  iterator: (PK: string, tokenAddress: string, chain: string) => Promise<void>,
  coinPlatformData: any,
) {
  const platforms = coin.platforms as StringObject;
  for (const platform in platforms) {
    if (platform !== "" && platforms[platform] !== "") {
      try {
        const chain = platformMap[platform.toLowerCase()];
        if (chain === undefined) {
          continue;
        }
        const address =
          chain + ":" + lowercase(platforms[platform]!, chain).trim();
        const PK = `asset#${address}`;
        if (!coinPlatformData[PK]) {
          await iterator(PK, platforms[platform]!, chain);
        }
      } catch (e) {
        console.error(coin, platform, e);
      }
    }
  }
}

export async function getCoinPlatformData(coins: Coin[]) {
  const coinPlatformData: any = {};
  const pks = [];
  try {
    for (const coin of coins) {
      const platforms = coin.platforms as StringObject;
      for (const platform in platforms) {
        if (platform !== "" && platforms[platform] !== "") {
          const chain = platformMap[platform.toLowerCase()];
          if (chain === undefined) {
            continue;
          }
          const address =
            chain + ":" + lowercase(platforms[platform]!, chain).trim();
          const PK = `asset#${address}`;
          pks.push(PK);
        }
      }
    }

    const step = 100;
    if (pks.length == 0) return;
    for (let i = 0; i < pks.length; i += step) {
      const storedItems: any = await ddb.batchGet(
        pks.slice(i, i + step).map((PK) => ({ PK, SK: 0 })),
      );
      storedItems.Responses["prod-coins-table"].forEach((item: any) => {
        coinPlatformData[item.PK] = item;
      });
    }
  } catch (e) {
    console.error(e);
  }
  return coinPlatformData;
}
