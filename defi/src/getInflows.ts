import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";
import protocols from "./protocols/data";
import sluggify from "./utils/sluggify";
import getTVLOfRecordClosestToTimestamp from "./utils/shared/getRecordClosestToTimestamp";
import { hourlyTokensTvl, hourlyUsdTokensTvl } from "./utils/getLastRecord";
import cgSymbols from "./utils/symbols/symbols.json";
import { getCurrentUnixTimestamp } from "./utils/date";
import { IProtocol } from "./types";
import { normalizeCgIds } from "./utils/symbols/convert";
import setEnvSecrets from "./utils/shared/setEnvSecrets";

const geckoSymbols = cgSymbols as { [key: string]: string };

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  await setEnvSecrets()
  const protocolName = event.pathParameters?.protocol?.toLowerCase();
  const tokensToExclude = event.queryStringParameters?.tokensToExclude?.split(",") ?? [];
  const timestamp = Number(event.pathParameters?.timestamp);
  const endTimestamp = Number(event.queryStringParameters?.end ?? getCurrentUnixTimestamp());
  const protocolData = protocols.find((prot) => sluggify(prot) === protocolName);
  if (!protocolData) {
    return errorResponse({ message: "Protocol not found" });
  }

  const old = await getTVLOfRecordClosestToTimestamp(hourlyTokensTvl(protocolData?.id!), timestamp, 2 * 3600);
  if (old.SK === undefined) {
    return errorResponse({ message: "No data at that timestamp" });
  }
  const [currentTokens, currentUsdTokens] = await Promise.all(
    [hourlyTokensTvl, hourlyUsdTokensTvl].map((prefix) => getTVLOfRecordClosestToTimestamp(prefix(protocolData?.id!), endTimestamp, 2 * 3600))
  );

  if (!currentTokens || !currentTokens.SK || !currentUsdTokens || !currentTokens.SK) {
    return errorResponse({ message: "No data" });
  }
  return successResponse(computeInflowsData(protocolData as IProtocol, currentTokens, currentUsdTokens, old, tokensToExclude))
};

export function computeInflowsData(protocolData: IProtocol, currentTokens: any, currentUsdTokens: any, old: any, tokensToExclude: string[]) {
  
  const tokenDiff: { [token: string]: number } = {};

  for (const token in currentTokens.tvl) {
    tokenDiff[token] = (tokenDiff[token] || 0) + (currentTokens.tvl[token] || 0);
  }

  for (const token in old.tvl) {
    const formattedToken = tokenDiff[token]
      ? token
      : tokenDiff[geckoSymbols[token]]
      ? geckoSymbols[token]
      : tokenDiff[tokenMapping[token]]
      ? tokenMapping[token]
      : null;

    if (formattedToken) {
      tokenDiff[formattedToken] -= old.tvl[token];
    } else {
      console.log(
        `Inflows: Couldn't find ${token} in last tokens record of ${protocolData!.name}(id: ${protocolData!.id})`
      );

      delete tokenDiff[token];
    }
  }

  let outflows = 0;

  for (const token in tokenDiff) {
    const formattedToken = normalizeCgIds(token) || tokenMapping[token] || token;
    if (!tokensToExclude.includes(formattedToken)) {
      const currentAmount = currentTokens!.tvl[token];

      const currentPrice = currentUsdTokens!.tvl[token] / currentAmount;

      const diff = tokenDiff[token];

      outflows += diff * currentPrice;
    }
  }

  return {
    outflows,
    oldTokens: { date: old.SK, tvl: old.tvl },
    currentTokens: { date: currentTokens.SK, tvl: currentTokens.tvl },
  }
}

export default wrap(handler);

const tokenMapping: { [key: string]: string } = {
  WETH: "ETH",
  WBNB: "BNB",
};
