import { getCache } from "../../utils/cache";
import { storeMissingCoins } from "../../utils/missingCoins";
import { addToDBWritesList, batchWriteWithAlerts } from "../utils/database";
import { storeOkxTokens } from "./postgres";
import { Write } from "../utils/dbInterfaces";
import {
  MetadataResults,
  OkxResponse,
  OkxTokenResponse,
  TokenPK,
} from "./types";
import { convertQueriesToOkxForm, fetchWithAuth } from "./utils";

function filterForUnknownPrices(
  requestedCoins: string[],
  response: any,
): TokenPK[] {
  response;
  const tokens: TokenPK[] = [];
  requestedCoins.map((coin: string) => {
    if (coin in response) return;
    const [chain, address] = coin.toLowerCase().split(":");
    tokens.push({ chain, address });
  });

  return tokens;
}

function sortResults(
  queryMap: { [key: string]: string },
  metadataResults: MetadataResults,
  tokensWithOkxData: { [token: string]: OkxTokenResponse },
  response: any,
): { writes: Write[]; missingTokens: TokenPK[]; okxTokens: TokenPK[] } {
  const writes: Write[] = [];
  const missingTokens: TokenPK[] = [];
  const okxTokens: TokenPK[] = [];
  Object.values(queryMap).map((k: string) => {
    const [chain, address] = k.split(":");

    if (!(chain in metadataResults) || !(address in metadataResults[chain])) {
      missingTokens.push({ chain, address });
      return;
    }

    const { price, time } = tokensWithOkxData[k];
    const { decimals, symbol } = metadataResults[chain][address];
    const timestamp = Math.floor(time / 1000);
    okxTokens.push({ address, chain });
    addToDBWritesList(
      writes,
      chain,
      address,
      Number(price),
      Number(decimals),
      symbol,
      timestamp,
      "okx",
      0.9,
    );
    response[k] = {
      decimals,
      symbol,
      price,
      timestamp,
      confidence: 0.9,
    };
  });

  return { writes, missingTokens, okxTokens };
}

export async function fetchOkxCurrentPrices(
  requestedCoins: string[],
  response: any,
): Promise<void> {
  const tokens: TokenPK[] = filterForUnknownPrices(requestedCoins, response);

  if (!tokens.length) return;
  const unfilteredMetadataResults: MetadataResults = await getCache(
    "okx",
    "all",
  );
  const metadataResults: MetadataResults = {};
  tokens.map(({ chain, address }) => {
    if (!(chain in unfilteredMetadataResults)) return;
    if (!(address in unfilteredMetadataResults[chain])) return;
    if (!(chain in metadataResults)) metadataResults[chain] = {};
    metadataResults[chain][address] = unfilteredMetadataResults[chain][address];
  });

  if (!Object.keys(metadataResults).length) {
    storeMissingCoins(tokens);
    return;
  }

  const { queries, queryMap } = convertQueriesToOkxForm(tokens);
  let okxRes: OkxResponse = await fetchWithAuth("current-price", {
    body: queries,
  });

  if (!okxRes.data.length) return;

  const tokensWithOkxData: { [token: string]: OkxTokenResponse } = {};
  okxRes.data.map((o: OkxTokenResponse) => {
    const key = `${o.chainIndex}:${o.tokenAddress}`;
    if (!(key in queryMap)) return;
    tokensWithOkxData[queryMap[key]] = o;
  });

  const { missingTokens, writes, okxTokens } = sortResults(
    queryMap,
    metadataResults,
    tokensWithOkxData,
    response,
  );

  await Promise.all([
    storeMissingCoins(missingTokens),
    batchWriteWithAlerts(writes, true),
    storeOkxTokens(okxTokens),
  ]);
}
