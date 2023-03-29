require("dotenv").config();
import { successResponse, wrap, IResponse } from "./utils/shared";
import getRecordClosestToTimestamp from "./utils/shared/getRecordClosestToTimestamp";
import { CoinsResponse, getBasicCoins } from "./utils/getCoinsUtils";
import { storeMissingCoins } from "./utils/missingCoins";
import { getCurrentUnixTimestamp } from "./utils/date";
import { quantisePeriod } from "./utils/timestampUtils";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const requestedCoins = (event.pathParameters?.coins ?? "").split(",");
  const searchWidth: number = quantisePeriod(
    event.queryStringParameters?.searchWidth?.toLowerCase() ?? "6h"
  );
  const timestampRequested = Number(event.pathParameters!.timestamp);
  const { PKTransforms, coins } = await getBasicCoins(requestedCoins);
  const response = {} as CoinsResponse;
  await Promise.all(
    coins.map(async (coin) => {
      const finalCoin = await getRecordClosestToTimestamp(
        coin.redirect ?? coin.PK,
        timestampRequested,
        searchWidth
      );
      if (finalCoin.SK === undefined) {
        // if (process.env.DEFILLAMA_SDK_MUTED == "true") {
        //   const currentCoin = await getRecordClosestToTimestamp(
        //     coin.redirect ?? coin.PK,
        //     getCurrentUnixTimestamp(),
        //     DAY / 4
        //   );
        //   if (currentCoin.SK == undefined) {
        //     return;
        //   }
        //   await currentCoin.adapter()
        // } else {
        return;
        // }
      }
      response[PKTransforms[coin.PK]] = {
        decimals: coin.decimals,
        symbol: coin.symbol,
        price: finalCoin.price,
        timestamp: finalCoin.SK,
        confidence: finalCoin.confidence
      };
    })
  );
  // await storeMissingCoins(requestedCoins, response, timestampRequested);
  return successResponse(
    {
      coins: response
    },
    3600
  ); // 1 hour cache
};

export default wrap(handler);

// handler({
//   pathParameters: {
//     coins:
//       "ethereum:0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8,ethereum:0x03403154afc09Ce8e44C3B185C82C6aD5f86b9ab",
//     //"1664897509" //
//     timestamp: "1656944730"
//   }
// });
// ts-node coins/src/getHistoricalCoins.ts
