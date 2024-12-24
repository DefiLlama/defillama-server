import { successResponse, wrap, IResponse } from "./utils/shared";
import { batchWrite } from "./utils/shared/dynamodb";
import {
  CoinsResponse,
  fetchCgPriceData,
  getBasicCoins,
} from "./utils/getCoinsUtils";
import { setTimer } from "./utils/shared/coingeckoLocks";
import setEnvSecrets from "./utils/shared/setEnvSecrets";
import { getR2, storeR2JSONString } from "./utils/r2";
console.log("imports done");
const margin = 5 * 60; // 5 mins

const handler = async (event: any): Promise<IResponse> => {
  // await setEnvSecrets();
  // process.env.tableName = "prod-coins-table";
  console.log("entered handler");
  const start = new Date().getTime();
  console.log("fetching r2");
  const bulkPromise = await getR2(`updated-coins`).then((r) =>
    JSON.parse(r.body!),
  );
  console.log("fetched r2");
  const unixStart = Math.floor(start / 1000);
  setTimer();

  console.log("timer set");
  const requestedCoins = (event.pathParameters?.coins ?? "").split(",");
  console.log("fetching basic coins");
  const { PKTransforms, coins } = await getBasicCoins(requestedCoins);
  console.log(`basic coins length: ${coins.length}`);

  const response = {} as CoinsResponse;
  const cgIds: { [pk: string]: string } = {};
  let bulk: { [id: string]: any } = bulkPromise;
  coins.map((d) => {
    if (d.PK in bulk && bulk[d.PK] > unixStart - margin) return;
    if (d.timestamp && d.timestamp > unixStart - margin) return;
    if (!d.redirect || !d.redirect.startsWith("coingecko#")) return;

    const id = d.redirect.substring(d.redirect.indexOf("#") + 1);
    if (id in bulk && bulk[id] > unixStart - margin) return;

    cgIds[d.PK] = id;
    bulk[id] = unixStart;
  });

  console.log(`mapped`);
  if (!Object.keys(cgIds).length) return successResponse({});
  console.log(`fetching from cg`);
  const newData = await fetchCgPriceData(Object.values(cgIds), true);
  console.log(`new data length: ${newData.length}`);

  const writes: any[] = [];
  coins.map(async ({ PK, symbol, decimals }) => {
    if (!(PK in cgIds)) return;
    const confidence = 0.99;
    const id = cgIds[PK];
    if (!(id in newData)) return;
    const {
      usd_market_cap: mcap,
      usd: price,
      last_updated_at: SK,
    } = newData[id];

    bulk[PK] = unixStart;
    response[PKTransforms[PK]] = {
      decimals,
      price,
      symbol,
      timestamp: SK,
      confidence,
    };

    if (PK in bulk && bulk[PK] > unixStart - margin / 2) return;
    writes.push(
      ...[
        {
          PK: `coingecko#${id}`,
          SK: 0,
          price,
          mcap,
          timestamp: SK,
          symbol,
          confidence,
        },
        {
          PK: `coingecko#${id}`,
          SK,
          price,
          confidence,
          adapter: "updateCoin",
        },
      ],
    );
  });

  console.log(`writes length: ${writes.length}`);
  await Promise.all([
    batchWrite(writes, false),
    storeR2JSONString("updated-coins", JSON.stringify(bulk)),
  ]);

  console.log(`writes written`);
  const end = new Date().getTime();
  const duration = `${end - start}ms`;
  console.log(`response`);
  return successResponse({
    coins: response,
    duration,
  });
};

export default wrap(handler);

// handler({
//   pathParameters: {
//     coins: "ethereum:0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
//   },
// });
// ts-node coins/src/updateCoin.ts
