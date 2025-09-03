import type { Protocol } from "../../protocols/types";
import { nonChains, getChainDisplayName, transformNewChainName, addToChains } from "../../utils/normalizeChain";
import type { IProtocolResponse, } from "../../types";
import { getRaises, getCachedMCap, CACHE_KEYS, cacheAndRespond, cache, getLastHourlyRecord, getLastHourlyTokensUsd, getLastHourlyTokens } from "../cache/index";
import { getAllProtocolItems, } from "../db/index";
import { normalizeEthereum, selectChainFromItem, } from "../../utils/craftProtocol";
import {
  hourlyTvl, hourlyTokensTvl, hourlyUsdTokensTvl,
} from "../../utils/getLastRecord"
import * as sdk from '@defillama/sdk'
import { getProtocolAllTvlData } from "./cachedFunctions";
import { getObjectKeyCount } from ".";
import { parentProtocolsById } from "../../protocols/parentProtocols";
import sluggify from "../../utils/sluggify";
import { _InternalProtocolMetadataMap } from "../../protocols/data";

export type CraftProtocolV2Common = {
  useNewChainNames: boolean;
  useHourlyData: boolean;
  skipAggregatedTvl: boolean;
  restrictResponseSize?: boolean;
  skipCachedHourlyData?: boolean;
  feMini?: boolean; // for fetching only aggregated tvl data without token breakdown & without raw token balancesMi
  skipFeMiniTransform?: boolean; // for feMini we return data in ([date, usdValue]: [number, number]) instead of default { date: number, totalLiquidityUSD: number } format
}


export type CraftProtocolV2Options = CraftProtocolV2Common & {
  protocolData: Protocol;
  getCachedProtocolData?: Function;
}

export async function craftProtocolV2({
  protocolData,
  useNewChainNames,
  useHourlyData,
  skipAggregatedTvl,
  restrictResponseSize,
  getCachedProtocolData = getProtocolAllTvlData,
  skipCachedHourlyData = false,
  feMini = false,
  skipFeMiniTransform = false,
}: CraftProtocolV2Options) {
  const { misrepresentedTokens = false, ...restProtocolData } = protocolData as any
  const { hallmarks } = _InternalProtocolMetadataMap[protocolData.id] || {};

  const debug_t0 = performance.now(); // start the timer
  let protocolCache: any = {}
  const isDeadProtocolOrHourly = !!protocolData.deadFrom || useHourlyData

  if (!useHourlyData)
    protocolCache = await getCachedProtocolData(protocolData, true)

  let _getLastHourlyRecord: any = null
  let _getLastHourlyTokensUsd: any = null
  let _getLastHourlyTokens: any = null

  if (!isDeadProtocolOrHourly && !skipCachedHourlyData) {
    _getLastHourlyRecord = getLastHourlyRecord(protocolData as any)
    _getLastHourlyTokensUsd = getLastHourlyTokensUsd(protocolData as any)
    _getLastHourlyTokens = getLastHourlyTokens(protocolData as any)
  }

  let [historicalUsdTvl, historicalUsdTokenTvl, historicalTokenTvl, mcap, lastUsdHourlyRecord, lastUsdTokenHourlyRecord, lastTokenHourlyRecord] = await Promise.all([
    useHourlyData ? getAllProtocolItems(hourlyTvl, protocolData.id) : null,
    useHourlyData ? getAllProtocolItems(hourlyUsdTokensTvl, protocolData.id) : null,
    useHourlyData ? getAllProtocolItems(hourlyTokensTvl, protocolData.id) : null,
    getCachedMCap(protocolData.gecko_id),
    _getLastHourlyRecord,
    _getLastHourlyTokensUsd,
    _getLastHourlyTokens,
  ]);

  if (!useHourlyData) {
    historicalUsdTvl = protocolCache[0]
    historicalUsdTokenTvl = protocolCache[1]
    historicalTokenTvl = protocolCache[2]
  }

  if (feMini) {
    historicalUsdTokenTvl = []
    historicalTokenTvl = []
    lastUsdTokenHourlyRecord = null
    lastTokenHourlyRecord = null
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
    
    if (Array.isArray(container?.tvl) && Array.isArray(historicalUsdTvl)) {
      for (const item of historicalUsdTvl) {
        let usdValue = selectChainFromItem(item, chain)
        if (typeof Math.floor(usdValue) === 'number') {
          usdValue = Math.floor(usdValue)
          if (feMini && !skipFeMiniTransform) container.tvl.push([item.SK, usdValue] as any)
          else container.tvl.push({ date: item.SK, totalLiquidityUSD: usdValue })
        }
      }
    }
    
    if (Array.isArray(container?.tokensInUsd) && Array.isArray(historicalUsdTokenTvl)) {
      for (const item of historicalUsdTokenTvl) {
        const tokens = normalizeEthereum(selectChainFromItem(item, chain))
        if (tokens) container.tokensInUsd.push({ date: item.SK, tokens })
      }
    }

    if (Array.isArray(container?.tokens) && Array.isArray(historicalTokenTvl)) {
      for (const item of historicalTokenTvl) {
        const tokens = normalizeEthereum(selectChainFromItem(item, chain))
        if (tokens) container.tokens.push({ date: item.SK, tokens })
      }
    }
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
    response.chainTvls[singleChain] !== undefined &&
    response.chainTvls[singleChain].tvl.length < (response.tvl ?? []).length
  ) {
    const singleChainTvls = response.chainTvls[singleChain].tvl;
    const first = singleChainTvls[0].date;
    response.chainTvls[singleChain].tvl = (response.tvl ?? []).filter((t: any) => t.date < first).concat(singleChainTvls);
  }

  if (skipAggregatedTvl) {
    response.tvl = [];
    response.tokensInUsd = [];
    response.tokens = [];
  }

  let parentName = null;
  let childProtocolsNames: string[] = [];
  let parentProtocolId = protocolData.parentProtocol;

  if (parentProtocolId && parentProtocolsById[parentProtocolId]) {
    const parent = parentProtocolsById[parentProtocolId]
    response.parentProtocolSlug = sluggify(parent as any);
    parentName = parent.name ?? null;
    childProtocolsNames = cache.otherProtocolsMap[parentProtocolId] ?? []
  }

  if (childProtocolsNames.length > 0 && parentName) {
    response.otherProtocols = [parentName, ...childProtocolsNames];
  }

  if (restProtocolData.methodology) {
    response.methodology = restProtocolData.methodology;
  }

  if (misrepresentedTokens === true)
    response.misrepresentedTokens = true;

  if (Array.isArray(hallmarks) && hallmarks.length > 0) {
    response.hallmarks = hallmarks as any
  }

  if (restProtocolData.deprecated) {
    response.deprecated = true
  }

  if (restProtocolData.warningBanners) {
    response.warningBanners = restProtocolData.warningBanners;
  }

  if (restProtocolData.rugged) {
    response.rugged = true;
  }
  if (restProtocolData.deadUrl) {
    response.deadUrl = true;
  }

  // const debug_formTime = performance.now() - debug_t0 - debug_dbTime
  // const debug_totalTime = performance.now() - debug_t0
  // sdk.log(`${protocolData.name} |${useHourlyData ? 'h' : 'd'}| #: ${historicalUsdTvl.length} ${historicalUsdTokenTvl.length} ${historicalTokenTvl.length} | Db: ${(debug_dbTimeAll / 1e3).toFixed(2)}s | All: ${(debug_totalTime / 1e3).toFixed(2)}s`)


  if (!feMini && restrictResponseSize) {
    const keyCount = getObjectKeyCount(response)
    if (keyCount > 1.5e5) { // there are more than 150k keys
      // console.log(`${response.name} Response size is too large: ${keyCount} keys. Limiting response size.`)
      Object.keys(response?.chainTvls ?? {}).forEach((key) => {
        response.chainTvls[key].tokensInUsd = null
        response.chainTvls[key].tokens = null
      })
    }
  }

  return response;
}


export async function craftProtocolV2Test({
  protocolData,
  useNewChainNames,
  useHourlyData,
  skipAggregatedTvl,
  restrictResponseSize,
  getCachedProtocolData = getProtocolAllTvlData,
  skipCachedHourlyData = false,
  feMini = false,
  skipFeMiniTransform = false,
}: CraftProtocolV2Options) {
  const { misrepresentedTokens = false, ...restProtocolData } = protocolData as any
  const { hallmarks } = _InternalProtocolMetadataMap[protocolData.id] || {};

  const debug_t0 = performance.now(); // start the timer
  let protocolCache: any = {}
  const isDeadProtocolOrHourly = !!protocolData.deadFrom || useHourlyData

  if (!useHourlyData)
    protocolCache = await getCachedProtocolData(protocolData, true)

  let _getLastHourlyRecord: any = null
  let _getLastHourlyTokensUsd: any = null
  let _getLastHourlyTokens: any = null

  if (!isDeadProtocolOrHourly && !skipCachedHourlyData) {
    _getLastHourlyRecord = getLastHourlyRecord(protocolData as any)
    _getLastHourlyTokensUsd = getLastHourlyTokensUsd(protocolData as any)
    _getLastHourlyTokens = getLastHourlyTokens(protocolData as any)
  }

  let [historicalUsdTvl, historicalUsdTokenTvl, historicalTokenTvl, mcap, lastUsdHourlyRecord, lastUsdTokenHourlyRecord, lastTokenHourlyRecord] = await Promise.all([
    useHourlyData ? getAllProtocolItems(hourlyTvl, protocolData.id) : null,
    useHourlyData ? getAllProtocolItems(hourlyUsdTokensTvl, protocolData.id) : null,
    useHourlyData ? getAllProtocolItems(hourlyTokensTvl, protocolData.id) : null,
    getCachedMCap(protocolData.gecko_id),
    _getLastHourlyRecord,
    _getLastHourlyTokensUsd,
    _getLastHourlyTokens,
  ]);

  if (!useHourlyData) {
    historicalUsdTvl = protocolCache[0]
    historicalUsdTokenTvl = protocolCache[1]
    historicalTokenTvl = protocolCache[2]
  }

  if (feMini) {
    historicalUsdTokenTvl = []
    historicalTokenTvl = []
    lastUsdTokenHourlyRecord = null
    lastTokenHourlyRecord = null
  }
  const debug_dbTimeAll = performance.now() - debug_t0

  let response: any = {
    ...restProtocolData,
    chainTvls: {},
    tvl: [],
    tokensInUsd: [],
    tokens: [],
    chains: [],
    currentChainTvls: {},
    raises: getRaises(protocolData.id),
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
    
    if (Array.isArray(container?.tvl) && Array.isArray(historicalUsdTvl)) {
      for (const item of historicalUsdTvl) {
        let usdValue = selectChainFromItem(item, chain)
        if (typeof Math.floor(usdValue) === 'number') {
          usdValue = Math.floor(usdValue)
          if (feMini && !skipFeMiniTransform) container.tvl.push([item.SK, usdValue] as any)
          else container.tvl.push({ date: item.SK, totalLiquidityUSD: usdValue })
        }
      }
    }
    
    if (Array.isArray(container?.tokensInUsd) && Array.isArray(historicalUsdTokenTvl)) {
      for (const item of historicalUsdTokenTvl) {
        const tokens = normalizeEthereum(selectChainFromItem(item, chain))
        if (tokens) container.tokensInUsd.push({ date: item.SK, tokens })
      }
    }

    if (Array.isArray(container?.tokens) && Array.isArray(historicalTokenTvl)) {
      for (const item of historicalTokenTvl) {
        const tokens = normalizeEthereum(selectChainFromItem(item, chain))
        if (tokens) container.tokens.push({ date: item.SK, tokens })
      }
    }
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
    response.chainTvls[singleChain] !== undefined &&
    response.chainTvls[singleChain].tvl.length < (response.tvl ?? []).length
  ) {
    const singleChainTvls = response.chainTvls[singleChain].tvl;
    const first = singleChainTvls[0].date;
    response.chainTvls[singleChain].tvl = (response.tvl ?? []).filter((t: any) => t.date < first).concat(singleChainTvls);
  }

  if (skipAggregatedTvl) {
    response.tvl = [];
    response.tokensInUsd = [];
    response.tokens = [];
  }

  let parentName = null;
  let childProtocolsNames: string[] = [];
  let parentProtocolId = protocolData.parentProtocol;

  if (parentProtocolId && parentProtocolsById[parentProtocolId]) {
    const parent = parentProtocolsById[parentProtocolId]
    response.parentProtocolSlug = sluggify(parent as any);
    parentName = parent.name ?? null;
    childProtocolsNames = cache.otherProtocolsMap[parentProtocolId] ?? []
  }

  if (childProtocolsNames.length > 0 && parentName) {
    response.otherProtocols = [parentName, ...childProtocolsNames];
  }

  if (restProtocolData.methodology) {
    response.methodology = restProtocolData.methodology;
  }

  if (misrepresentedTokens === true)
    response.misrepresentedTokens = true;

  if (Array.isArray(hallmarks) && hallmarks.length > 0) {
    response.hallmarks = hallmarks as any
  }

  if (restProtocolData.deprecated) {
    response.deprecated = true
  }

  if (restProtocolData.warningBanners) {
    response.warningBanners = restProtocolData.warningBanners;
  }

  if (restProtocolData.rugged) {
    response.rugged = true;
  }
  if (restProtocolData.deadUrl) {
    response.deadUrl = true;
  }

  response.lastUsdHourlyRecord = lastUsdHourlyRecord;
  response.historicalUsdTvl = historicalUsdTvl;

  // const debug_formTime = performance.now() - debug_t0 - debug_dbTime
  // const debug_totalTime = performance.now() - debug_t0
  // sdk.log(`${protocolData.name} |${useHourlyData ? 'h' : 'd'}| #: ${historicalUsdTvl.length} ${historicalUsdTokenTvl.length} ${historicalTokenTvl.length} | Db: ${(debug_dbTimeAll / 1e3).toFixed(2)}s | All: ${(debug_totalTime / 1e3).toFixed(2)}s`)


  if (!feMini && restrictResponseSize) {
    const keyCount = getObjectKeyCount(response)
    if (keyCount > 1.5e5) { // there are more than 150k keys
      // console.log(`${response.name} Response size is too large: ${keyCount} keys. Limiting response size.`)
      Object.keys(response?.chainTvls ?? {}).forEach((key) => {
        response.chainTvls[key].tokensInUsd = null
        response.chainTvls[key].tokens = null
      })
    }
  }

  return response;
}

export async function cachedCraftProtocolV2(options: CraftProtocolV2Options) {
  const sizeKey = options.restrictResponseSize ? 'smol' : 'normal'
  const protoId = options.protocolData.id
  const hourlyKey = options.useHourlyData ? 'hourly' : 'daily'
  const aggKey = options.skipAggregatedTvl ? 'noAgg' : 'agg'
  const newChainKey = options.useNewChainNames ? 'new' : 'old'
  const id = `${protoId}-${hourlyKey}-${aggKey}-${newChainKey}-${sizeKey}`
  const CACHE_KEY = CACHE_KEYS.PROTOCOL
  return cacheAndRespond({ key: CACHE_KEY, id, origFunction: craftProtocolV2, args: [options] })
}