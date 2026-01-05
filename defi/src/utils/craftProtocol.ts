import type { Protocol } from "../protocols/types";
import protocols, { _InternalProtocolMetadataMap } from "../protocols/data";
import ddb, { getHistoricalValues } from "./shared/dynamodb";
import {
  getLastRecord,
  hourlyTvl,
  dailyTvl,
  dailyUsdTokensTvl,
  dailyTokensTvl,
  hourlyUsdTokensTvl,
  hourlyTokensTvl,
} from "./getLastRecord";
import { nonChains, getChainDisplayName, transformNewChainName, addToChains } from "./normalizeChain";
import type { IProtocolResponse, IRaise } from "../types";
import parentProtocols from "../protocols/parentProtocols";
import fetch from "node-fetch";
import { convertSymbols } from "./symbols/convert";

export function normalizeEthereum(balances: { [symbol: string]: number }) {
  if (typeof balances === "object") {
    convertSymbols(balances);
  }
  const formattedBalances: { [symbol: string]: number } = {};

  for (const b in balances) {
    if (typeof balances[b] === "string") {
      formattedBalances[b] = Number(Number(balances[b]).toFixed(5));
    } else {
      formattedBalances[b] = Number(balances[b].toFixed(5));
    }
  }

  return balances && formattedBalances;
}

export function selectChainFromItem(item: any, normalizedChain: string) {
  let altChainName = undefined;
  if (normalizedChain.startsWith("avax")) {
    altChainName = normalizedChain.replace("avax", "avalanche");
  } else if (normalizedChain.startsWith("avalanche")) {
    altChainName = normalizedChain.replace("avalanche", "avax");
  } else {
    return item[normalizedChain];
  }
  return item[normalizedChain] ?? item[altChainName];
}

let raisesPromise: Promise<any> | undefined = undefined;

export async function getRaises() {
  if (!raisesPromise) raisesPromise = fetch("https://api.llama.fi/raises").then((res) => res.json());
  return raisesPromise;
}

export const protocolMcap = async (geckoId?: string | null) => {
  if (!geckoId) return null;

  const mcap = await fetch("https://coins.llama.fi/mcaps", {
    method: "POST",
    body: JSON.stringify({
      coins: [`coingecko:${geckoId}`],
    }),
  })
    .then((r) => r.json())
    .catch((err) => {
      console.log(err);
      return {};
    });

  return mcap?.[`coingecko:${geckoId}`]?.mcap ?? null;
};

export async function buildCoreData({
  protocolData,
  useNewChainNames,
  useHourlyData,
}: {
  protocolData: Protocol;
  useNewChainNames: boolean;
  useHourlyData: boolean;
}) {
  const { hallmarks, misrepresentedTokens } = _InternalProtocolMetadataMap[protocolData.id] || {};
  const [historicalUsdTvl, historicalUsdTokenTvl, historicalTokenTvl] = await Promise.all([
    getHistoricalValues((useHourlyData ? hourlyTvl : dailyTvl)(protocolData.id)),
    misrepresentedTokens
      ? ([] as any[])
      : getHistoricalValues((useHourlyData ? hourlyUsdTokensTvl : dailyUsdTokensTvl)(protocolData.id)),
    misrepresentedTokens
      ? ([] as any[])
      : getHistoricalValues((useHourlyData ? hourlyTokensTvl : dailyTokensTvl)(protocolData.id)),
  ]);

  let response: Pick<IProtocolResponse, "chainTvls" | "tvl"> = {
    chainTvls: {},
    tvl: [],
  };

  const lastRecord = historicalUsdTvl[historicalUsdTvl.length - 1];

  Object.entries(lastRecord ?? {}).forEach(([chain]) => {
    if (nonChains.includes(chain) && chain !== "tvl") {
      return;
    }

    const displayChainName = getChainDisplayName(chain, useNewChainNames);

    const container = {} as any;

    container.tvl = historicalUsdTvl
      ?.map((item) => ({
        date: item.SK,
        totalLiquidityUSD: selectChainFromItem(item, chain) && Number(selectChainFromItem(item, chain).toFixed(5)),
      }))
      .filter((item) => item.totalLiquidityUSD === 0 || item.totalLiquidityUSD);

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
  return response;
}

function fetchFrom(pk: string, start: number) {
  return ddb
    .query({
      ExpressionAttributeValues: {
        ":pk": pk,
        ":sk": start,
      },
      KeyConditionExpression: "PK = :pk AND SK > :sk",
    })
    .then((r) => r.Items ?? []);
}

export default async function craftProtocol({
  protocolData,
  useNewChainNames,
  useHourlyData,
  skipAggregatedTvl,
}: {
  protocolData: Protocol;
  useNewChainNames: boolean;
  useHourlyData: boolean;
  skipAggregatedTvl: boolean;
}) {
  const lastTimestamp = 0;

  const [historicalUsdTvl, historicalUsdTokenTvl, historicalTokenTvl] = await Promise.all([
    fetchFrom((useHourlyData ? hourlyTvl : dailyTvl)(protocolData.id), lastTimestamp),
    fetchFrom((useHourlyData ? hourlyUsdTokensTvl : dailyUsdTokensTvl)(protocolData.id), lastTimestamp),
    fetchFrom((useHourlyData ? hourlyTokensTvl : dailyTokensTvl)(protocolData.id), lastTimestamp),
  ]);

  const { hallmarks, misrepresentedTokens, methodology } = _InternalProtocolMetadataMap[protocolData.id] || {};
  const [lastUsdHourlyRecord, lastUsdTokenHourlyRecord, lastTokenHourlyRecord, { raises }, mcap] = await Promise.all([
    getLastRecord(hourlyTvl(protocolData.id)),
    getLastRecord(hourlyUsdTokensTvl(protocolData.id)),
    getLastRecord(hourlyTokensTvl(protocolData.id)),
    getRaises(),
    protocolMcap(protocolData.gecko_id),
  ]);

  if (!useHourlyData) {
    // check for falsy values and push lastHourlyRecord to dataset
    lastUsdHourlyRecord &&
      lastUsdHourlyRecord.SK !== historicalUsdTvl[historicalUsdTvl.length - 1]?.SK &&
      historicalUsdTvl.push(lastUsdHourlyRecord);
    lastUsdTokenHourlyRecord &&
      lastUsdTokenHourlyRecord.SK !== historicalUsdTokenTvl[historicalUsdTokenTvl.length - 1]?.SK &&
      historicalUsdTokenTvl.push(lastUsdTokenHourlyRecord);
    lastTokenHourlyRecord &&
      lastTokenHourlyRecord.SK !== historicalTokenTvl[historicalTokenTvl.length - 1]?.SK &&
      historicalTokenTvl.push(lastTokenHourlyRecord);
  }

  let response: IProtocolResponse = {
    tvl: [],
    chainTvls: {},
    tokensInUsd: [],
    tokens: [],
    ...protocolData,
    chains: [],
    currentChainTvls: {},
    raises: raises?.filter((raise: IRaise) => raise.defillamaId?.toString() === protocolData.id.toString()) ?? [],
    mcap,
  } as any;

  Object.entries(lastUsdHourlyRecord ?? {}).forEach(([chain, chainTvl]) => {
    if (nonChains.includes(chain) && chain !== "tvl") {
      return;
    }

    const displayChainName = getChainDisplayName(chain, useNewChainNames);
    addToChains(response.chains, displayChainName);
    if (chain !== "tvl") {
      response.currentChainTvls[displayChainName] = chainTvl ? Number(chainTvl.toFixed(5)) : 0;
    }
    if (chain !== "tvl" && response.chainTvls[displayChainName] === undefined) {
      response.chainTvls[displayChainName] = {
        tvl: [],
        tokensInUsd: [],
        tokens: [],
      };
    }
    const container = chain === "tvl" ? response : response.chainTvls[displayChainName];

    container?.tvl?.push(
      ...historicalUsdTvl
        ?.map((item) => ({
          date: item.SK,
          totalLiquidityUSD: selectChainFromItem(item, chain) && Number(selectChainFromItem(item, chain).toFixed(5)),
        }))
        .filter((item) => item.totalLiquidityUSD === 0 || item.totalLiquidityUSD)
    );

    container?.tokensInUsd?.push(
      ...historicalUsdTokenTvl
        ?.map((item) => ({
          date: item.SK,
          tokens: normalizeEthereum(selectChainFromItem(item, chain)),
        }))
        .filter((item) => item.tokens)
    );

    container?.tokens?.push(
      ...historicalTokenTvl
        ?.map((item) => ({
          date: item.SK,
          tokens: normalizeEthereum(selectChainFromItem(item, chain)),
        }))
        .filter((item) => item.tokens)
    );
  });

  const singleChain = transformNewChainName(protocolData.chain);

  if (response.chainTvls[singleChain] === undefined && response.chains.length === 0) {
    response.chains.push(singleChain);
    response.chainTvls[singleChain] = {
      tvl: response.tvl ?? [],
      tokensInUsd: response.tokensInUsd,
      tokens: response.tokens,
    };
  }

  if (
    response.tvl &&
    response.chainTvls[singleChain] !== undefined &&
    response.chainTvls[singleChain].tvl.length < response.tvl.length
  ) {
    const singleChainTvls = response.chainTvls[singleChain].tvl;
    const first = singleChainTvls[0].date;
    response.chainTvls[singleChain].tvl = response.tvl.filter((t: any) => t.date < first).concat(singleChainTvls);
  }

  if (skipAggregatedTvl) {
    response.tvl = [];
    response.tokensInUsd = [];
    response.tokens = [];
  }

  const childProtocolsNames = protocolData.parentProtocol
    ? protocols.filter((p) => p.parentProtocol === protocolData.parentProtocol).map((p) => p.name)
    : [];

  const parent = parentProtocols.find((p) => p.id === protocolData.parentProtocol);

  if (childProtocolsNames.length > 0 && parent?.name) {
    response.otherProtocols = [parent.name, ...childProtocolsNames];
  }

  if (!response.referralUrl && parent?.referralUrl) {
    response.referralUrl = parent.referralUrl;
  }

  if (methodology) {
    response.methodology = methodology;
  }
  if (misrepresentedTokens === true) {
    response.misrepresentedTokens = true;
  }
  if (hallmarks) {
    (response as any).hallmarks = hallmarks;

  }
  if (protocolData.deprecated) {
    response.deprecated = protocolData.deprecated;
  }
  if (protocolData.warningBanners) {
    response.warningBanners = protocolData.warningBanners;
  }
  if (protocolData.rugged) {
    response.rugged = protocolData.rugged;
  }
  if (protocolData.deadUrl) {
    response.deadUrl = protocolData.deadUrl;
  }

  return response;
}
