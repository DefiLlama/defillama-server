require("dotenv").config();
import { successResponse, wrap, IResponse } from "./utils/shared";
import { getRecordClosestToTimestamp } from "./utils/shared/getRecordClosestToTimestamp";
import parseRequestBody from "./utils/shared/parseRequestBody";
import { getBasicCoins } from "./utils/getCoinsUtils";
import { quantisePeriod } from "./utils/timestampUtils";
import { lowercaseAddress } from "./utils/processCoin";
import { runInPromisePool } from "@defillama/sdk/build/generalUtil";

const searchWidth = quantisePeriod("12h");

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const body = parseRequestBody(event.body);
  const coinsObj: { [coin: string]: number[] } = body.coins;
  const coinAddresses = Object.keys(coinsObj);
  const { PKTransforms, coins } = await getBasicCoins(coinAddresses);

  const response = {} as any;
  const promises: Promise<any>[] = [];

  coinAddresses.forEach((coinAddress) => {
    const timestamps: number[] = coinsObj[coinAddress];
    if (isNaN(timestamps?.length)) return;
    const coin = coins.find((c) =>
      c.PK.includes(
        coinAddress.includes("coingecko")
          ? coinAddress.replace(":", "#").toLowerCase()
          : lowercaseAddress(coinAddress)
      )
    );
    if (coin == null) return;
    promises.push(
      ...timestamps.map(async (timestamp) => {
        const finalCoin: any = await getRecordClosestToTimestamp(
          coin.redirect ?? coin.PK,
          timestamp,
          searchWidth
        );
        if (finalCoin?.SK === undefined) {
          return;
        }

        if (typeof coin?.decimals === 'string' && !isNaN(Number(coin.decimals)))
          coin.decimals = Number(coin.decimals);

        PKTransforms[coin.PK].forEach((coinName) => {
          if (response[coinName] == undefined) {
            response[coinName] = {
              symbol: coin.symbol,
              decimals: coin.decimals,
              prices: [
                {
                  timestamp: finalCoin.SK,
                  price: finalCoin.price,
                  confidence: finalCoin.confidence,
                },
              ],
            };
          } else {
            response[coinName].prices.push({
              timestamp: finalCoin.SK,
              price: finalCoin.price,
              confidence: finalCoin.confidence,
            });
          }
        });
      })
    );
  });

  await runInPromisePool({
    items: promises,
    concurrency: 7,
    processor: async (promise: any) => await promise,
  });

  return successResponse(
    {
      coins: response,
    },
    3600
  );
};

export default wrap(handler);
