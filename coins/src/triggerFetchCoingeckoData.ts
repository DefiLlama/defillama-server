import { wrapScheduledLambda } from "./utils/shared/wrap";
import fetch from "node-fetch";
import invokeLambda from "./utils/shared/invokeLambda";
import { shuffleArray } from "./utils/shared/shuffleArray";

const hourlyLambda = `coins-prod-fetchHourlyCoingeckoData`;
const step = 500;
const handler = (lambdaFunctioName: string) => async () => {
  const coins = await fetch(
    `https://api.coingecko.com/api/v3/coins/list?include_platform=true`,
  ).then((r) => r.json());
  shuffleArray(coins)
  for (let i = 0; i < coins.length; i += step) {
    const event = {
      coins: coins.slice(i, i + step),
      depth: 0,
    };
    await invokeLambda(lambdaFunctioName, event);
  }
};

export const triggerNewFetches = wrapScheduledLambda(
  handler(`coins-prod-fetchCoingeckoData`),
);
export const triggerHourlyFetches = wrapScheduledLambda(handler(hourlyLambda));
