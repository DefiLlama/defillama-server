import { successResponse, wrap, IResponse } from "./utils/shared";
import { batchWrite } from "./utils/shared/dynamodb";
import {
  CoinsResponse,
  fetchCgPriceData,
  getBasicCoins,
} from "./utils/getCoinsUtils";
import { getCache, setCache } from "./utils/cache";
import setEnvSecrets from "./utils/shared/setEnvSecrets";
import { setTimer } from "./utils/shared/coingeckoLocks";

const margin = 60 * 60 * 2; // 2 hours
const handler = async (event: any): Promise<IResponse> => {
  // this should require internal key
  await setEnvSecrets();
  const start = new Date().getTime();
  const unixStart = start / 1000;
  setTimer();
  const requestedCoins = (event.pathParameters?.coins ?? "").split(",");
  const { PKTransforms, coins } = await getBasicCoins(requestedCoins);

  const response = {} as CoinsResponse;
  const cgIds: { [pk: string]: string } = {};
  coins.map((d) => {
    if (d.timestamp && d.timestamp > unixStart - margin) return;
    if (!d.redirect || !d.redirect.startsWith("coingecko#")) return;
    const id = d.redirect.substring(d.redirect.indexOf("#") + 1);
    cgIds[d.PK] = id;
  });

  if (!cgIds.length) return successResponse({});
  // fetch new data and cache
  const [newData, bulk] = await Promise.all([
    fetchCgPriceData(Object.values(cgIds)),
    getCache("coins-swap", "bulk"),
  ]);

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

    response[PKTransforms[PK]] = {
      decimals,
      price,
      symbol,
      timestamp: SK,
      confidence,
    };

    if (PK in bulk && bulk[PK] > unixStart - margin * 2) return;
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
        },
      ],
    );
    bulk[PK] = SK;
  });

  // write to cache and DB
  await Promise.all([
    batchWrite(writes, false),
    setCache("coins-swap", "bulk", bulk),
  ]);

  // return anyway
  const end = new Date().getTime();
  const duration = `${end - start}ms`;
  return successResponse({
    coins: response,
    duration,
  });
};

export default wrap(handler);

handler({
  pathParameters: {
    coins:
      "base:0xbaa5cc21fd487b8fcc2f632f3f4e8d37262a0842,base:0vdfvdfv,ethereum:0x57f6bddf2e015feb13e8f86cb7bb5a6a62723ffe",
  },
});
// ts-node coins/src/updateCoin.ts
