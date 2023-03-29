require("dotenv").config();
import { wrapScheduledLambda } from "./utils/shared/wrap";
import fetch from "node-fetch";
import invokeLambda from "./utils/shared/invokeLambda";
import { storeTokens } from "./adapters/bridges";

const hourlyLambda = `coins-prod-fetchHourlyCoingeckoData`;
const step = 500;
const handler = (lambdaFunctioName: string) => async () => {
  const coins = await fetch(
    `https://pro-api.coingecko.com/api/v3/coins/list?include_platform=true?&x_cg_pro_api_key=${process.env.CG_KEY}`,
  ).then((r) => r.json());
  for (let i = 0; i < coins.length; i += step) {
    const event = {
      coins: coins.slice(i, i + step),
      depth: 0,
    };
    await invokeLambda(lambdaFunctioName, event);
  }
  console.log(lambdaFunctioName);
  if (lambdaFunctioName === hourlyLambda) {
    await storeTokens();
  }
};

export const triggerNewFetches = wrapScheduledLambda(
  handler(`coins-prod-fetchCoingeckoData`),
);
export const triggerHourlyFetches = wrapScheduledLambda(handler(hourlyLambda));
