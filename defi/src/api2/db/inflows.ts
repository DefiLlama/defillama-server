import { wrap, IResponse, successResponse, errorResponse } from "../../utils/shared";
import protocols from "../../protocols/data";
import sluggify from "../../utils/sluggify";
import getTVLOfRecordClosestToTimestamp from "../../utils/shared/getRecordClosestToTimestamp";
import { hourlyTokensTvl, hourlyUsdTokensTvl } from "../../utils/getLastRecord";
import cgSymbols from "../../utils/symbols/symbols.json";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { IProtocol } from "../../types";
import { getInflowRecords } from ".";

const geckoSymbols = cgSymbols as { [key: string]: string };

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const protocolName = event.pathParameters?.protocol?.toLowerCase();
  const tokensToExclude = event.queryStringParameters?.tokensToExclude?.split(",") ?? [];
  const timestamp = Number(event.pathParameters?.timestamp);
  const endTimestamp = Number(event.queryStringParameters?.end ?? getCurrentUnixTimestamp());
  const protocolData = protocols.find((prot) => sluggify(prot) === protocolName) as IProtocol
  if (!protocolData) {
    return errorResponse({ message: "Protocol not found" });
  }

  return ddbGetInflows({
    errorResponse: (message: string) => errorResponse({ message }),
    successResponse, tokensToExclude,
    protocolData, skipTokenLogs: false, timestamp, endTimestamp,
  }) as any
}

export async function ddbGetInflows({ errorResponse, successResponse, protocolData, tokensToExclude, skipTokenLogs, timestamp, endTimestamp, }: {
  errorResponse: any, successResponse: any, protocolData: IProtocol, tokensToExclude: string[], skipTokenLogs: boolean, timestamp: number, endTimestamp: number,
}) {

  const oldTokens = await getTVLOfRecordClosestToTimestamp(hourlyTokensTvl(protocolData?.id!), timestamp, 2 * 3600);
  if (oldTokens.SK === undefined)
    return errorResponse("No data at that timestamp");

  const [currentTokens, currentUsdTokens] = await Promise.all(
    [hourlyTokensTvl, hourlyUsdTokensTvl].map((prefix) => getTVLOfRecordClosestToTimestamp(prefix(protocolData?.id!), endTimestamp, 2 * 3600))
  );

  if (!currentTokens || !currentTokens.SK || !currentUsdTokens || !currentTokens.SK) {
    return errorResponse("No data");
  }

  return successResponse(computeInflowsData({
    protocolData: protocolData as IProtocol,
    currentTokens,
    currentUsdTokens,
    oldTokens,
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
  tokensToExclude = [],
  skipTokenLogs = true
}: {
  protocolData?: IProtocol,
  currentTokens: any,
  currentUsdTokens: any,
  oldTokens: any,
  tokensToExclude?: string[],
  skipTokenLogs?: boolean
}) {
  const tokenExcludeSet = new Set(tokensToExclude.map(formatToken).concat(tokensToExclude));  // normalize excluded tokens and to be safe, also include original versions
  type tvlData = { [token: string]: number };
  const tokenDiff: tvlData = {};
  const currentTvl: tvlData = {}
  const currentUSDTvl: tvlData = {}
  const oldTvl: tvlData = {}


  function addValuesToTvlMap(tvlMap: tvlData, token: string, amount: any, subtract = false) {
    const ratio = subtract ? -1 : 1;

    if (!tvlMap[token]) tvlMap[token] = 0;
    if (!amount) amount = 0;
    tvlMap[token] += amount * ratio;
  }

  for (const [token, value] of Object.entries(currentTokens.tvl)) {
    const formattedToken = formatToken(token);
    addValuesToTvlMap(tokenDiff, formattedToken, value);
    addValuesToTvlMap(currentTvl, formattedToken, value) // add to new object with formatted tokens
  }

  for (const [token, value] of Object.entries(currentUsdTokens.tvl)) {
    const formattedToken = formatToken(token);
    addValuesToTvlMap(currentUSDTvl, formattedToken, value) // add to new object with formatted tokens
  }

  for (const [token, value] of Object.entries(oldTokens.tvl)) {
    const formattedToken = formatToken(token)
    addValuesToTvlMap(oldTvl, formattedToken, value)// add to new object with formatted tokens

    if (tokenDiff.hasOwnProperty(formattedToken)) {
      addValuesToTvlMap(tokenDiff, formattedToken, value, true);

    } else {


      if (!skipTokenLogs)
        console.log(
          `Inflows: Couldn't find ${token} in last tokens record of ${protocolData?.name}(id: ${protocolData?.id})`
        );

      delete tokenDiff[token];
    }
  }

  let outflows = 0;

  // console.log(JSON.stringify({ tokenDiff, tokenExcludeSet, currentTokens, oldTokens, currentUsdTokens }))

  const table = []
  for (const token in tokenDiff) {
    if (!tokenExcludeSet.has(token)) {
      const currentAmount = currentTvl[token]
      const currentUSDValue = currentUSDTvl[token]

      if (!currentAmount || currentAmount === 0) continue;

      const currentPrice = currentUSDValue / currentAmount;

      const diff = tokenDiff[token];
      table.push({ token, diff, currentPrice, currentAmount, value: diff * currentPrice });

      outflows += diff * currentPrice;
    }
  }

  return {
    outflows,
    oldTokens: { date: oldTokens.SK, tvl: oldTvl },
    currentTokens: { date: currentTokens.SK, tvl: currentTvl },
  }
}

type InflowsResponse = {
  outflows: number,
  oldTokens: { date: string, tvl: { [token: string]: number } },
  currentTokens: { date: string, tvl: { [token: string]: number } },
}


// this method uses Postgres to get inflows data, is more lenient to missing data, and faster for bulk requests
export async function pgGetInflows({ ids, startTimestamp, endTimestamp, }: {
  ids: string[] | {
    id: string,
    tokensToExclude: string[]
  }[],
  startTimestamp: number,
  endTimestamp?: number,  // defaults to now
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
    const { oldTokens, currentTokens, currentUsdTokens } = inflowRecords[protocolId]
    if (!oldTokens || !currentTokens || !currentUsdTokens) continue;

    response[protocolId] = computeInflowsData({
      oldTokens,
      currentTokens,
      currentUsdTokens,
      tokensToExclude: tokenExcludeConfig[protocolId],
    })
  }

  return response
}

export default wrap(handler);

const tokenMapping: { [key: string]: string } = {
  WETH: "ETH",
  WBNB: "BNB",
};
