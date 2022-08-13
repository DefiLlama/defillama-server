import type { Protocol } from "../protocols/types";
import protocols from "../protocols/data";
import { getHistoricalValues } from "./shared/dynamodb";
import {
  getLastRecord,
  hourlyTvl,
  dailyTvl,
  dailyUsdTokensTvl,
  dailyTokensTvl,
  hourlyUsdTokensTvl,
  hourlyTokensTvl,
} from "./getLastRecord";
import { importAdapter } from "./imports/importAdapter";
import {
  nonChains,
  getChainDisplayName,
  transformNewChainName,
  addToChains,
} from "./normalizeChain";
import type { IProtocolResponse } from "../types";
import parentProtocols from "../protocols/parentProtocols";

function normalizeEthereum(balances: { [symbol: string]: number }) {
  if (balances?.ethereum !== undefined) {
    balances["WETH"] = (balances["WETH"] ?? 0) + balances["ethereum"];
    delete balances["ethereum"];
  }
  const formattedBalances: { [symbol: string]: number } = {};

  for (const b in balances) {
    if (typeof typeof balances[b] === "string") {
      formattedBalances[b] = Number(Number(balances[b]).toFixed(5));
    } else {
      formattedBalances[b] = Number(balances[b].toFixed(5));
    }
  }

  return balances && formattedBalances;
}

type HistoricalTvls = AWS.DynamoDB.DocumentClient.ItemList | undefined;
type HourlyTvl = AWS.DynamoDB.DocumentClient.AttributeMap | undefined;

function replaceLast(historical: HistoricalTvls, last: HourlyTvl) {
  if (historical !== undefined && last !== undefined) {
    historical[historical.length - 1] = last;
  }
}

function selectChainFromItem(item: any, normalizedChain: string) {
  let altChainName = undefined;
  if (normalizedChain === "avax") {
    altChainName = "avalanche";
  } else if (normalizedChain === "avalanche") {
    altChainName = "avax";
  } else {
    return item[normalizedChain];
  }
  return item[normalizedChain] ?? item[altChainName];
}

export default async function craftProtocol(
  protocolData: Protocol,
  useNewChainNames: boolean,
  useHourlyData: boolean,
  skipReplaceLast: boolean
) {
  const [
    lastUsdHourlyRecord,
    lastUsdTokenHourlyRecord,
    lastTokenHourlyRecord,
    historicalUsdTvl,
    historicalUsdTokenTvl,
    historicalTokenTvl,
    module,
  ] = await Promise.all([
    getLastRecord(hourlyTvl(protocolData.id)),
    getLastRecord(hourlyUsdTokensTvl(protocolData.id)),
    getLastRecord(hourlyTokensTvl(protocolData.id)),
    getHistoricalValues(
      (useHourlyData ? hourlyTvl : dailyTvl)(protocolData.id)
    ),
    getHistoricalValues(
      (useHourlyData ? hourlyUsdTokensTvl : dailyUsdTokensTvl)(protocolData.id)
    ),
    getHistoricalValues(
      (useHourlyData ? hourlyTokensTvl : dailyTokensTvl)(protocolData.id)
    ),
    importAdapter(protocolData),
  ]);

  if (!useHourlyData && !skipReplaceLast) {
    // replaceLast(historicalUsdTvl, lastUsdHourlyRecord);
    // replaceLast(historicalUsdTokenTvl, lastUsdTokenHourlyRecord);
    // replaceLast(historicalTokenTvl, lastTokenHourlyRecord);

    // check for falsy values and push lastHourlyRecord to dataset
    lastUsdHourlyRecord && historicalUsdTvl.push(lastUsdHourlyRecord);
    lastUsdTokenHourlyRecord &&
      historicalUsdTokenTvl.push(lastUsdTokenHourlyRecord);
    lastTokenHourlyRecord && historicalTokenTvl.push(lastTokenHourlyRecord);
  }

  let response: IProtocolResponse = {
    ...protocolData,
    chains: [],
    currentChainTvls: {},
    chainTvls: {},
    tvl: [],
  };

  const childProtocols = protocolData.parentProtocol
    ? protocols
        .filter((p) => p.parentProtocol === protocolData.parentProtocol)
        ?.map((p) => p.name)
    : [];

  const parentName =
    parentProtocols.find((p) => p.id === protocolData.parentProtocol)?.name ??
    null;

  if (childProtocols.length > 0 && parentName) {
    response.otherProtocols = [parentName, ...childProtocols];
  }

  if (module.methodology) {
    response.methodology = module.methodology;
  }
  if (module.misrepresentedTokens) {
    response.misrepresentedTokens = true;
  }
  if (module.hallmarks) {
    response.hallmarks = module.hallmarks;
  }

  lastUsdHourlyRecord &&
    Object.entries(lastUsdHourlyRecord!).forEach(([chain, chainTvl]) => {
      if (nonChains.includes(chain) && chain !== "tvl") {
        return;
      }

      const displayChainName = getChainDisplayName(chain, useNewChainNames);
      addToChains(response.chains, displayChainName);
      if (chain !== "tvl") {
        response.currentChainTvls[displayChainName] = chainTvl
          ? Number(chainTvl.toFixed(5))
          : 0;
      }
      const container = {} as any;

      container.tvl = historicalUsdTvl
        ?.map((item) => ({
          date: item.SK,
          totalLiquidityUSD:
            selectChainFromItem(item, chain) &&
            Number(selectChainFromItem(item, chain).toFixed(5)),
        }))
        .filter(
          (item) => item.totalLiquidityUSD === 0 || item.totalLiquidityUSD
        );

      container.tokensInUsd = historicalUsdTokenTvl
        ?.map((item) => ({
          date: item.SK,
          tokens: normalizeEthereum(selectChainFromItem(item, chain)),
        }))
        .filter((item) => item.tokens);

      container.tokens = historicalTokenTvl
        ?.map((item) => ({
          date: item.SK,
          tokens: normalizeEthereum(selectChainFromItem(item, chain)),
        }))
        .filter((item) => item.tokens);

      if (container.tvl !== undefined && container.tvl.length > 0) {
        if (chain === "tvl") {
          response = {
            ...response,
            ...container,
          };
        } else {
          response.chainTvls[displayChainName] = { ...container };
        }
      }
    });

  const singleChain = transformNewChainName(protocolData.chain);

  if (
    response.chainTvls[singleChain] === undefined &&
    response.chains.length === 0
  ) {
    response.chains.push(singleChain);
    response.chainTvls[singleChain] = {
      tvl: response.tvl,
      tokensInUsd: response.tokensInUsd,
      tokens: response.tokens,
    };
  }

  if (
    response.chainTvls[singleChain] !== undefined &&
    response.chainTvls[singleChain].tvl.length < response.tvl.length
  ) {
    const singleChainTvls = response.chainTvls[singleChain].tvl;
    const first = singleChainTvls[0].date;
    response.chainTvls[singleChain].tvl = response.tvl
      .filter((t: any) => t.date < first)
      .concat(singleChainTvls);
  }

  return response;
}
