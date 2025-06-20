import chainToCoingeckoId from "../../../common/chainToCoingeckoId";
import { getCurrentUnixTimestamp } from "./date";
import {
  chainsThatShouldNotBeLowerCased,
  chainsWithCaseSensitiveDataProviders,
} from "./shared/constants";
import ddb from "./shared/dynamodb";

export const staleMargin = 6 * 60 * 60;

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

export function padAddress(address: string, length: number = 66): string {
  let prefix = "0x";
  const data = address.substring(address.indexOf(prefix) + prefix.length);
  const zeros = length - prefix.length - data.length;
  for (let i = 0; i < zeros; i++) prefix += "0";
  return prefix + data;
}
export function lowercase(address: string, chain: string) {
  if (chain == "starknet") return padAddress(address.toLowerCase());
  return chainsThatShouldNotBeLowerCased.includes(chain)
    ? address
    : address.toLowerCase();
}

export async function iterateOverPlatforms(
  coin: Coin,
  iterator: (PK: string) => Promise<void>,
  coinPlatformData: any,
  aggregatedPlatforms: string[],
) {
  const platforms = coin.platforms as StringObject;
  for (const platform in platforms) {
    if (platform !== "" && platforms[platform] !== "") {
      try {
        const chain = platformMap[platform.toLowerCase()]?.toLowerCase();
        if (chain === undefined) {
          continue;
        }
        aggregatePlatforms(chain, platforms[platform]!, aggregatedPlatforms);
        const address =
          chain +
          ":" +
          (chainsWithCaseSensitiveDataProviders.includes(chain)
            ? platforms[platform]
            : lowercase(platforms[platform]!, chain).trim());
        const PK = `asset#${address}`;
        const margin = getCurrentUnixTimestamp() - staleMargin;
        if (
          !coinPlatformData[PK] ||
          coinPlatformData[PK].timestamp < margin ||
          coinPlatformData[PK].confidence < 0.99
        ) {
          await iterator(PK);
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

export async function aggregatePlatforms(
  chain: string,
  address: string,
  aggregatedPlatforms: string[],
) {
  const normalizedAddress = lowercase(address, chain);
  aggregatedPlatforms.push(`${chain}:${normalizedAddress}`);
}
