import { getRecordClosestToTimestamp } from "../../utils/shared/getRecordClosestToTimestamp";
import { hourlyTokensTvl, hourlyUsdTokensTvl } from "../../utils/getLastRecord";
import cgSymbols from "../../utils/symbols/symbols.json";
import { IProtocol } from "../../types";
import { getInflowRecords } from ".";
import { humanizeNumber } from "@defillama/sdk";

const geckoSymbols = cgSymbols as { [key: string]: string };

export async function ddbGetInflows({ errorResponse, successResponse, protocolData, tokensToExclude, skipTokenLogs, timestamp, endTimestamp, }: {
  errorResponse: any, successResponse: any, protocolData: IProtocol, tokensToExclude: string[], skipTokenLogs: boolean, timestamp: number, endTimestamp: number,
}) {

  const oldTokens = await getRecordClosestToTimestamp(hourlyTokensTvl(protocolData?.id!), timestamp, 2 * 3600);
  if (oldTokens?.SK === undefined)
    return errorResponse("No data at that timestamp");

  const oldUsdTokens = await getRecordClosestToTimestamp(hourlyUsdTokensTvl(protocolData?.id!), timestamp, 2 * 3600);

  const [currentTokens, currentUsdTokens] = await Promise.all(
    [hourlyTokensTvl, hourlyUsdTokensTvl].map((prefix) => getRecordClosestToTimestamp(prefix(protocolData?.id!), endTimestamp, 2 * 3600))
  );

  if (!currentTokens || !currentTokens.SK || !currentUsdTokens || !currentTokens.SK) {
    return errorResponse("No data");
  }

  return successResponse(computeInflowsData({
    protocolData: protocolData as IProtocol,
    currentTokens,
    currentUsdTokens,
    oldTokens,
    oldUsdTokens,
    tokensToExclude,
    skipTokenLogs
  }))
}

export function formatToken(token: string) {
  if (token.startsWith("coingecko:")) token = token.slice(10);
  if (geckoSymbols[token]) return geckoSymbols[token];
  if (tokenMapping[token]) return tokenMapping[token];
  return token;
}

export function computeInflowsData({
  protocolData,
  currentTokens,
  currentUsdTokens,
  oldTokens,
  oldUsdTokens,
  tokensToExclude = [],
  skipTokenLogs = true,
  withMetadata = false,
}: {
  protocolData?: IProtocol,
  currentTokens: any,
  currentUsdTokens: any,
  oldTokens: any,
  oldUsdTokens?: any,
  tokensToExclude?: string[],
  skipTokenLogs?: boolean,
  withMetadata?: boolean,
}) {
  const tokenExcludeSet = new Set(tokensToExclude.map(formatToken));
  type tvlData = { [token: string]: number };
  const currentTvl: tvlData = transformTokenMap(currentTokens);
  const currentUSDTvl: tvlData = transformTokenMap(currentUsdTokens);
  const oldTvl: tvlData = transformTokenMap(oldTokens);
  const oldUSDTvl: tvlData = transformTokenMap(oldUsdTokens)
  const priceMap: { [token: string]: { value: number, totalUSD: number } } = {}
  const whitelistedTokens = new Set() as Set<string>

  let minValueToConsiderToken = 10_000  // default to 10k USD
  const oldTotalTvlUSD = Object.values(oldUSDTvl).reduce((acc, value) => acc + value, 0)
  const currentTotalTvlUSD = Object.values(currentUSDTvl).reduce((acc, value) => acc + value, 0)
  const lowestTotalTvlUSD = Math.min(oldTotalTvlUSD, currentTotalTvlUSD) / 10000 // set 0.01% of total tvl as minUSDValue

  minValueToConsiderToken = Math.max(minValueToConsiderToken, lowestTotalTvlUSD)  // use the higher of 10k or 0.01% of total tvl

  // build price map from current and old usd tvl data
  Object.entries(currentUSDTvl).forEach(([token, usdValue]) => {
    const currentAmount = currentTvl[token]
    if (currentAmount && currentAmount > 0) {
      priceMap[token] = { value: usdValue / currentAmount, totalUSD: usdValue };

      if (usdValue >= minValueToConsiderToken)
        whitelistedTokens.add(token);

    }
  })

  Object.entries(oldUSDTvl).forEach(([token, usdValue]) => {
    const oldAmount = oldTvl[token]
    if (oldAmount && oldAmount > 0) {
      if (!priceMap[token] || priceMap[token].totalUSD < usdValue) {
        priceMap[token] = { value: usdValue / oldAmount, totalUSD: usdValue };
      }

      if (usdValue >= minValueToConsiderToken)
        whitelistedTokens.add(token);

    }
  })


  const tokenDiffUSD: { [token: string]: string } = {}

  let response: any = {
    outflows: 0,
    oldTokens: { date: oldTokens.SK, tvl: {} },
    currentTokens: { date: currentTokens.SK, tvl: {} },
  }

  // compute inflows / outflows based on whitelisted tokens only
  for (const token of whitelistedTokens) {
    const currentAmount = currentTvl[token] || 0
    const oldAmount = oldTvl[token] || 0
    const diff = currentAmount - oldAmount
    const priceInfo = priceMap[token]
    if (!priceInfo) continue;

    const usdDiff = diff * priceInfo.value
    if (usdDiff / 2 > priceInfo.totalUSD) { // ignore if diff is more than 200% of total usd value (probably data issue)
      if (!skipTokenLogs && !withMetadata)
        console.log(
          `Inflows: Ignoring ${token} diff for ${protocolData?.name}(id: ${protocolData?.id}) as usd diff ${humanizeNumber(usdDiff)} is more than 200% of total usd value ${humanizeNumber(priceInfo.totalUSD)}`
        );
      continue;
    }

    response.outflows += usdDiff
    response.oldTokens.tvl[token] = oldAmount
    response.currentTokens.tvl[token] = currentAmount

    if (withMetadata)
      tokenDiffUSD[token] = humanizeNumber(usdDiff)
  }

  if (withMetadata)
    response.tokenDiffUSD = tokenDiffUSD

  // delete response.tokenDiffUSD

  // standarize the tokens used as key and merge values into a new object
  function transformTokenMap(source: any = {}): tvlData {
    const result: tvlData = {}
    for (const [token, value] of Object.entries(source.tvl)) {
      const formattedToken = formatToken(token);

      // skip excluded tokens
      if (tokenExcludeSet.has(formattedToken)) continue;

      addValuesToTvlMap(result, formattedToken, value);
    }
    return result
  }

  function addValuesToTvlMap(tvlMap: tvlData, token: string, amount: any, subtract = false) {
    const ratio = subtract ? -1 : 1;

    if (!tvlMap[token]) tvlMap[token] = 0;
    if (!amount) amount = 0;
    tvlMap[token] += amount * ratio;
  }

  return response;
}

type InflowsResponse = {
  outflows: number,
  oldTokens: { date: string, tvl: { [token: string]: number } },
  currentTokens: { date: string, tvl: { [token: string]: number } },
}


// this method uses Postgres to get inflows data, is more lenient to missing data, and faster for bulk requests
export async function pgGetInflows({ ids, startTimestamp, endTimestamp, withMetadata = false, }: {
  ids: string[] | {
    id: string,
    tokensToExclude: string[]
  }[],
  startTimestamp: number,
  endTimestamp?: number,  // defaults to now
  withMetadata?: boolean,
}): Promise<{ [protocolId: string]: InflowsResponse }> {


  if (!endTimestamp) endTimestamp = Math.floor(Date.now() / 1e3)

  if (!(startTimestamp < endTimestamp - 3600))
    throw new Error("startTimestamp must be less than endTimestamp");


  if (!Array.isArray(ids) || ids.length === 0) {
    return {}
  }

  const tokenExcludeConfig: { [id: string]: string[] } = {};
  const protocolIds: string[] = [];

  ids.forEach((id) => {
    if (typeof id === "string") {
      protocolIds.push(id);
    } else {
      protocolIds.push(id.id);
      tokenExcludeConfig[id.id] = id.tokensToExclude;
    }
  })


  const inflowRecords = await getInflowRecords({ ids: protocolIds, startTimestamp, endTimestamp, })

  const response: { [protocolId: string]: InflowsResponse } = {};

  for (const protocolId of Object.keys(inflowRecords)) {
    const { oldTokens, currentTokens, currentUsdTokens, oldUsdTokens } = inflowRecords[protocolId]
    if (!oldTokens || !currentTokens || !currentUsdTokens) continue;


    response[protocolId] = computeInflowsData({
      oldUsdTokens,
      oldTokens,
      currentTokens,
      currentUsdTokens,
      tokensToExclude: tokenExcludeConfig[protocolId],
      withMetadata,
    })
  }

  return response
}

const tokenMapping: { [key: string]: string } = {
  WETH: "ETH",
  WBNB: "BNB",
};
