import type { Protocol } from "../../protocols/types";
import protocols from "../../protocols/data";
import { nonChains, getChainDisplayName, transformNewChainName, addToChains } from "../../utils/normalizeChain";
import type { IProtocolResponse, } from "../../types";
import parentProtocols from "../../protocols/parentProtocols";
import { getAvailableMetricsById } from "../../adaptors/data/configs";
import { getRaises, getCachedMCap, CACHE_KEYS, getCacheByCacheKey, setCacheByCacheKey, } from "../cache";
import { getAllProtocolItems, getLatestProtocolItem, } from "../db/index";
import { normalizeEthereum, selectChainFromItem, } from "../../utils/craftProtocol";
import {
  dailyTvl, dailyTokensTvl, dailyUsdTokensTvl, hourlyTvl, hourlyTokensTvl, hourlyUsdTokensTvl,
} from "../../utils/getLastRecord"
import * as sdk from '@defillama/sdk'

type CraftProtocolV2Options = {
  protocolData: Protocol;
  useNewChainNames: boolean;
  useHourlyData: boolean;
  skipAggregatedTvl: boolean;
}

export default async function craftProtocolV2({
  protocolData,
  useNewChainNames,
  useHourlyData,
  skipAggregatedTvl,
}: CraftProtocolV2Options) {
  const { misrepresentedTokens = false, hallmarks, methodology, ...restProtocolData } = protocolData as any

  const debug_t0 = performance.now(); // start the timer

  let [historicalUsdTvl, historicalUsdTokenTvl, historicalTokenTvl, mcap, lastUsdHourlyRecord, lastUsdTokenHourlyRecord, lastTokenHourlyRecord] = await Promise.all([
    getAllProtocolItems(useHourlyData ? hourlyTvl : dailyTvl, protocolData.id),
    getAllProtocolItems(useHourlyData ? hourlyUsdTokensTvl : dailyUsdTokensTvl, protocolData.id),
    getAllProtocolItems(useHourlyData ? hourlyTokensTvl : dailyTokensTvl, protocolData.id),
    getCachedMCap(protocolData.gecko_id),
    getLatestProtocolItem(hourlyTvl, protocolData.id),
    getLatestProtocolItem(hourlyUsdTokensTvl, protocolData.id),
    getLatestProtocolItem(hourlyTokensTvl, protocolData.id),
  ]);
  const debug_dbTime = performance.now() - debug_t0


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

  /* const lastRecord = historicalUsdTvl[historicalUsdTvl.length - 1];

  Object.entries(lastRecord ?? {}).forEach(([chain]) => {
    if (nonChains.includes(chain) && chain !== "tvl") {
      return;
    }

    const displayChainName = getChainDisplayName(chain, useNewChainNames);

    const container = {} as any;

    container.tvl = historicalUsdTvl
      ?.map((item: any) => ({
        date: item.SK,
        totalLiquidityUSD: selectChainFromItem(item, chain) && Number(selectChainFromItem(item, chain).toFixed(5)),
      }))
      .filter((item: any) => item.totalLiquidityUSD === 0 || item.totalLiquidityUSD);

    container.tokensInUsd = historicalUsdTokenTvl
      ?.map((item: any) => ({
        date: item.SK,
        tokens: normalizeEthereum(selectChainFromItem(item, chain)),
      }))
      .filter((item: any) => item.tokens);

    container.tokens = historicalTokenTvl
      ?.map((item: any) => ({
        date: item.SK,
        tokens: normalizeEthereum(selectChainFromItem(item, chain)),
      }))
      .filter((item: any) => item.tokens);

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
  }); */

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

  const childProtocolsNames = protocolData.parentProtocol
    ? protocols.filter((p) => p.parentProtocol === protocolData.parentProtocol).map((p) => p.name)
    : [];

  const parentName = parentProtocols.find((p) => p.id === protocolData.parentProtocol)?.name ?? null;

  if (childProtocolsNames.length > 0 && parentName) {
    response.otherProtocols = [parentName, ...childProtocolsNames];
  }

  if (methodology)
    response.methodology = methodology;

  if (misrepresentedTokens === true)
    response.misrepresentedTokens = true;

  if (hallmarks) {
    response.hallmarks = hallmarks;
    response.hallmarks?.sort((a, b) => a[0] - b[0]);
  }

  // const debug_formTime = performance.now() - debug_t0 - debug_dbTime
  const debug_totalTime = performance.now() - debug_t0
  sdk.log(`${protocolData.name} |${useHourlyData ? 'h' : 'd'}|#: ${historicalTokenTvl.length} ${historicalTokenTvl.length} ${historicalTokenTvl.length} | T(all): ${(debug_totalTime / 1e3).toFixed(3)}s | T(db) ${(debug_dbTime / 1e3).toFixed(3)}s`)

  return response;
}

export async function cachedCraftProtocolV2(options: CraftProtocolV2Options) {
  const id = `${options.protocolData.id}-${options.useHourlyData ? 'hourly' : 'daily'}-${options.skipAggregatedTvl ? 'noAgg' : 'agg'}-${options.useNewChainNames ? 'new' : 'old'}`
  let res = getCacheByCacheKey(CACHE_KEYS.PROTOCOL, id)
  if (res) return res
  res = craftProtocolV2(options)
  setCacheByCacheKey(CACHE_KEYS.PROTOCOL, id, res)
  return res
}