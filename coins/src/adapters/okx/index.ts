import { addToDBWritesList, batchWriteWithAlerts } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { OkxResponse, OkxTokenResponse } from "./types";
import {
  convertQueriesToOkxForm,
  fetchDecimalsAndSymbols,
  fetchWithAuth,
  logMissingTokens,
} from "./utils";

const tokens: string[] = [
  "ethereum:0x0000000000000000000000000000000000000000",
  "base:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
].map((t) => t.toLowerCase());

export async function fetchCurrentPrices() {
  const { queries, queryMap } = convertQueriesToOkxForm(tokens);
  let okxRes: OkxResponse = await fetchWithAuth("current-price", {
    body: queries,
  });

  const tokensWithOkxData: { [token: string]: OkxTokenResponse } = {};
  okxRes.data.map((o: OkxTokenResponse) => {
    const key = `${o.chainIndex}:${o.tokenAddress}`;
    if (!(key in queryMap)) return;
    tokensWithOkxData[queryMap[key]] = o;
  });

  const metadataResults: { [chain: string]: { [token: string]: any } } =
    await fetchDecimalsAndSymbols(tokensWithOkxData);

  const writes: Write[] = [];
  const llamaRes: any = {};
  Object.values(queryMap).map((k: string) => {
    const [chain, address] = k.split(":");
    const { price, time } = tokensWithOkxData[k];
    const { decimals, symbol } = metadataResults[chain][address];
    if (!decimals || !symbol) return;
    addToDBWritesList(
      writes,
      chain,
      address,
      price,
      decimals,
      symbol,
      time,
      "okx",
      0.9,
    );
    llamaRes[k] = {
      decimals,
      symbol,
      price,
      timestamp: time,
      confidence: 0.9,
    };
  });

  await Promise.all([logMissingTokens(), batchWriteWithAlerts(writes, true)]);

  return llamaRes;
}
// fetchCurrentPrices(); // ts-node coins/src/adapters/okx/index.ts
