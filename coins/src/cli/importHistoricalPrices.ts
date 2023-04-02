require("dotenv").config();
import fetch from "node-fetch";
import { toUNIXTimestamp, getCurrentUnixTimestamp } from "../utils/date";
import { batchWrite } from "../utils/shared/dynamodb";
import { cgPK } from "../utils/keys";
import { Coin } from "../utils/coingeckoPlatforms";
import { getCoingeckoLock, setTimer } from "../utils/shared/coingeckoLocks";

async function coingeckoRequest(url: string) {
  await getCoingeckoLock();
  return fetch(url).then((r) => r.json());
}

type PriceRange = [number, number][];
type PriceRangeResponse = {
  prices: PriceRange;
};

const DAY = 24 * 3600;

const lastTimestamp = getCurrentUnixTimestamp();
const firstTimestamp = 1483232400; // January 1, 2017 1:00:00 AM
const startingCoinIndex = 0;

async function storePrices(PK: string, prices: PriceRange) {
  console.log("\t", PK);
  await batchWrite(
    prices.map((price) => ({
      SK: toUNIXTimestamp(price[0]),
      PK,
      price: price[1],
    })),
    true
  )
}

async function getPrices(coin: Coin, fromTimestamp: number, toTimestamp: number) {
  if ((toTimestamp - fromTimestamp) > 90 * DAY) {
    throw new Error(
      "Timestamp difference is higher than 90 days, it needs to be lower in order to get hourly rates"
    );
  }
  const { prices } = await coingeckoRequest(
    `https://pro-api.coingecko.com/api/v3/coins/${coin.id}/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}&x_cg_pro_api_key=${process.env.CG_KEY}`
  ) as PriceRangeResponse
  return prices
}

async function main() {
  setTimer(1500);
  const coins = (await coingeckoRequest(
    `https://pro-api.coingecko.com/api/v3/coins/list&x_cg_pro_api_key=${process.env.CG_KEY}`
  )) as Coin[];
  for (
    let coinIndex = startingCoinIndex;
    coinIndex < coins.length;
    coinIndex++
  ) {
    const coin = coins[coinIndex];
    console.log(`Getting data for ${coin.id} at index ${coinIndex}...`);

    let toTimestamp = lastTimestamp;
    let fromTimestamp = toTimestamp - 80 * DAY; // -80 days
    let priceHistoryExhausted = false;
    try {
      while (!priceHistoryExhausted) {
        const prices = await getPrices(coin, fromTimestamp, toTimestamp)
        if (prices.length > 0) {
          await storePrices(cgPK(coin.id), prices);
          toTimestamp = fromTimestamp;
          fromTimestamp = toTimestamp - 80 * DAY;
        } else {
          priceHistoryExhausted = true;
        }
      }
    } catch (e) {
      console.log(e)
      console.log(`Error at token ${coinIndex}, retrying...`);
      coinIndex -= 1;
    }
  }
}
main();
