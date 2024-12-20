import { successResponse, wrap, IResponse } from "./utils/shared";
import { batchWrite } from "./utils/dynamodbV3";
import {
  CoinsResponse,
  fetchCgPriceData,
  getBasicCoins,
} from "./utils/getCoinsUtils";
import { getCache, setCache } from "./utils/cache";
import { setTimer } from "./utils/shared/coingeckoLocks";

const margin = 5 * 60; // 5 mins

const handler = async (event: any): Promise<IResponse> => {
  const start = new Date().getTime();
  const bulkPromise = getCache("coins-swap", "bulk");
  const unixStart = Math.floor(start / 1000);
  setTimer();

  const requestedCoins = (event.pathParameters?.coins ?? "").split(",");
  const { PKTransforms, coins } = await getBasicCoins(requestedCoins);

  const response = {} as CoinsResponse;
  const cgIds: { [pk: string]: string } = {};
  let bulk = await bulkPromise;
  coins.map((d) => {
    if (d.PK in bulk && bulk[d.PK] > unixStart - margin) return;
    if (d.timestamp && d.timestamp > unixStart - margin) return;
    if (!d.redirect || !d.redirect.startsWith("coingecko#")) return;

    const id = d.redirect.substring(d.redirect.indexOf("#") + 1);
    if (id in bulk && bulk[id] > unixStart - margin) return;

    cgIds[d.PK] = id;
    bulk[id] = unixStart;
  });

  if (!Object.keys(cgIds).length) return successResponse({});
  const newData = await fetchCgPriceData(Object.values(cgIds));

  const writes: any[] = [];
  coins.map(async ({ PK, symbol, decimals }) => {
    if (!(PK in cgIds)) return;
    const confidence = 0.99;
    const id = cgIds[PK];
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

  await Promise.all([
    batchWrite(writes, false),
    setCache("coins-swap", "bulk", bulk),
  ]);

  const end = new Date().getTime();
  const duration = `${end - start}ms`;
  return successResponse({
    coins: response,
    duration,
  });
};

export default wrap(handler);
