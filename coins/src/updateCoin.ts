import {
  successResponse,
  wrap,
  IResponse,
  errorResponse,
} from "./utils/shared";
import { batchGet, batchWrite } from "./utils/shared/dynamodb";
import parseRequestBody from "./utils/shared/parseRequestBody";
import { coinToPK } from "./utils/processCoin";
import { CoinsResponse, fetchCgPriceData } from "./utils/getCoinsUtils";
import { getCache, setCache } from "./utils/cache";
import setEnvSecrets from "./utils/shared/setEnvSecrets";
import { setTimer } from "./utils/shared/coingeckoLocks";

const handler = async (event: any): Promise<IResponse> => {
  await setEnvSecrets();
  setTimer();
  const { coins } = parseRequestBody(event.body);
  const coinData = await batchGet(
    coins.map((coin: string) => ({
      PK: coinToPK(coin),
      SK: 0,
    })),
  );
  const response = {} as CoinsResponse;
  const cgIds: { [pk: string]: string } = {};
  coinData.map((d) => {
    if (!d.redirect || !d.redirect.startsWith("coingecko#")) return;
    const id = d.redirect.substring(d.redirect.indexOf("#") + 1);
    cgIds[d.PK] = id;
  });

  // fetch new data and cache
  const [newData, bulk] = await Promise.all([
    fetchCgPriceData(Object.values(cgIds)),
    getCache("coins-swap", "bulk"),
  ]);

  const writes: any[] = [];
  coinData.map(async ({ PK, symbol }) => {
    if (!(PK in cgIds)) return;
    const confidence = 0.99;
    const id = cgIds[PK];
    const {
      usd_market_cap: mcap,
      usd: price,
      last_updated_at: SK,
    } = newData[id];
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
  //   await Promise.all([
  //     batchWrite(writes, false),
  //     setCache("coins-swap", "bulk", bulk),
  //   ]);

  // return anyway
  return successResponse({
    coins: response,
  });
};

export default wrap(handler);

handler({
  body: JSON.stringify({
    coins: [
      "base:0xbaa5cc21fd487b8fcc2f632f3f4e8d37262a0842",
      "base:0vdfvdfv",
      "ethereum:0x57f6bddf2e015feb13e8f86cb7bb5a6a62723ffe",
    ],
  }),
});
// ts-node coins/src/updateCoin.ts
