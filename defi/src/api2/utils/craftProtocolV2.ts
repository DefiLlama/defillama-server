import type { Protocol } from "../../protocols/types";
import { nonChains, getChainDisplayName, transformNewChainName, addToChains } from "../../utils/normalizeChain";
import type { IProtocolResponse, } from "../../types";
import { getAvailableMetricsById } from "../../adaptors/data/configs";
import { getRaises, getCachedMCap, CACHE_KEYS, cacheAndRespond, cache, getLastHourlyRecord, getLastHourlyTokensUsd, getLastHourlyTokens } from "../cache/index";
import { getAllProtocolItems, } from "../db/index";
import { normalizeEthereum, selectChainFromItem, } from "../../utils/craftProtocol";
import {
  hourlyTvl, hourlyTokensTvl, hourlyUsdTokensTvl,
} from "../../utils/getLastRecord"
import * as sdk from '@defillama/sdk'
import { getProtocolAllTvlData } from "./cachedFunctions";

export type CraftProtocolV2Common = {
  useNewChainNames: boolean;
  useHourlyData: boolean;
  skipAggregatedTvl: boolean;
}


export type CraftProtocolV2Options = CraftProtocolV2Common & {
  protocolData: Protocol;
}

export async function craftProtocolV2({
  protocolData,
  useNewChainNames,
  useHourlyData,
  skipAggregatedTvl,
}: CraftProtocolV2Options) {
  const { misrepresentedTokens = false, hallmarks, methodology, ...restProtocolData } = protocolData as any

  const debug_t0 = performance.now(); // start the timer
  let protocolCache: any = {}
  const isDeadProtocolOrHourly = !!protocolData.deadFrom || useHourlyData

  if (!useHourlyData)
    protocolCache = await getProtocolAllTvlData(protocolData, true)

  let [historicalUsdTvl, historicalUsdTokenTvl, historicalTokenTvl, mcap, lastUsdHourlyRecord, lastUsdTokenHourlyRecord, lastTokenHourlyRecord] = await Promise.all([
    !useHourlyData ? null : getAllProtocolItems(hourlyTvl, protocolData.id),
    !useHourlyData ? null : getAllProtocolItems(hourlyUsdTokensTvl, protocolData.id),
    !useHourlyData ? null : getAllProtocolItems(hourlyTokensTvl, protocolData.id),
    getCachedMCap(protocolData.gecko_id),
    isDeadProtocolOrHourly ? null : getLastHourlyRecord(protocolData as any),
    isDeadProtocolOrHourly ? null : getLastHourlyTokensUsd(protocolData as any),
    isDeadProtocolOrHourly ? null : getLastHourlyTokens(protocolData as any),
  ]);

  if (!useHourlyData) {
    historicalUsdTvl = protocolCache[0]
    historicalUsdTokenTvl = protocolCache[1]
    historicalTokenTvl = protocolCache[2]
  }
  const debug_dbTimeAll = performance.now() - debug_t0

  let response: IProtocolResponse = {
    ...restProtocolData,
    chainTvls: {},
    tvl: [],
    tokensInUsd: [],
    tokens: [],
    chains: [],
    currentChainTvls: {},
    raises: getRaises(protocolData.id),
    metrics: getAvailableMetricsById(protocolData.id),
    mcap,
  };

  if (!lastUsdHourlyRecord)
    lastUsdHourlyRecord = historicalUsdTvl[historicalUsdTvl.length - 1]
  if (!lastUsdTokenHourlyRecord)
    lastUsdTokenHourlyRecord = historicalUsdTokenTvl[historicalUsdTokenTvl.length - 1]
  if (!lastTokenHourlyRecord)
    lastTokenHourlyRecord = historicalTokenTvl[historicalTokenTvl.length - 1]

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

  Object.entries(lastUsdHourlyRecord ?? {}).forEach(([chain, chainTvl]: [string, any]) => {
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
        ?.map((item: any) => ({
          date: item.SK,
          totalLiquidityUSD: selectChainFromItem(item, chain) && Number(selectChainFromItem(item, chain).toFixed(5)),
        }))
        .filter((item: any) => item.totalLiquidityUSD === 0 || item.totalLiquidityUSD)
    );

    container?.tokensInUsd?.push(
      ...historicalUsdTokenTvl
        ?.map((item: any) => ({
          date: item.SK,
          tokens: normalizeEthereum(selectChainFromItem(item, chain)),
        }))
        .filter((item: any) => item.tokens)
    );

    container?.tokens?.push(
      ...historicalTokenTvl
        ?.map((item: any) => ({
          date: item.SK,
          tokens: normalizeEthereum(selectChainFromItem(item, chain)),
        }))
        .filter((item: any) => item.tokens)
    );
  });

  const singleChain = transformNewChainName(protocolData.chain);

  if (response.chainTvls[singleChain] === undefined && response.chains.length === 0) {
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
    response.chainTvls[singleChain].tvl = response.tvl.filter((t: any) => t.date < first).concat(singleChainTvls);
  }

  if (skipAggregatedTvl) {
    response.tvl = [];
    response.tokensInUsd = [];
    response.tokens = [];
  }

  let parentName = null;
  let childProtocolsNames: string[] = [];
  let parentProtocolId = protocolData.parentProtocol;

  if (parentProtocolId) {
    parentName = cache.metadata.parentProtocols.find((p) => p.id === parentProtocolId)?.name ?? null;
    childProtocolsNames = cache.metadata.protocols.filter((p) => p.parentProtocol === parentProtocolId).map((p) => p.name);
  }

  if (childProtocolsNames.length > 0 && parentName) {
    response.otherProtocols = [parentName, ...childProtocolsNames];
  }

  if (methodology)
    response.methodology = methodology;

  if (misrepresentedTokens === true)
    response.misrepresentedTokens = true;

  if (Array.isArray(hallmarks) && hallmarks.length > 0) {
    response.hallmarks = hallmarks;
    response.hallmarks?.sort((a, b) => a[0] - b[0]);
  }

  // const debug_formTime = performance.now() - debug_t0 - debug_dbTime
  const debug_totalTime = performance.now() - debug_t0
  // sdk.log(`${protocolData.name} |${useHourlyData ? 'h' : 'd'}| #: ${historicalUsdTvl.length} ${historicalUsdTokenTvl.length} ${historicalTokenTvl.length} | Db: ${(debug_dbTimeAll / 1e3).toFixed(2)}s | All: ${(debug_totalTime / 1e3).toFixed(2)}s`)

  return response;
}

export async function cachedCraftProtocolV2(options: CraftProtocolV2Options) {
  const id = `${options.protocolData.id}-${options.useHourlyData ? 'hourly' : 'daily'}-${options.skipAggregatedTvl ? 'noAgg' : 'agg'}-${options.useNewChainNames ? 'new' : 'old'}`
  const CACHE_KEY = CACHE_KEYS.PROTOCOL
  return cacheAndRespond({ key: CACHE_KEY, id, origFunction: craftProtocolV2, args: [options] })
}
