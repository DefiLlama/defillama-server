import type { IParentProtocol } from "../../protocols/types";
import { errorResponse } from "../../utils/shared";
import { IProtocol, IProtocolResponse, } from "../../types";
import { craftParentProtocolInternal } from "../../utils/craftParentProtocol";
import { cache, getCachedMCap, CACHE_KEYS, cacheAndRespond, getRaises, } from "../cache/index";
import { craftProtocolV2 } from './craftProtocolV2'
import * as sdk from '@defillama/sdk'

type CraftParentProtocolV2Options = {
  parentProtocol: IParentProtocol;
  skipAggregatedTvl: boolean;
  feMini?: boolean; // for fetching only aggregated tvl data without token breakdown & without raw token balances
}

export async function craftParentProtocolV2({
  parentProtocol,
  skipAggregatedTvl,
  feMini = false,
}: CraftParentProtocolV2Options) {
  const debug_t0 = performance.now(); // start the timer
  const childProtocols = cache.childProtocols[parentProtocol.id] ?? []

  if (childProtocols.length < 1 || childProtocols.map((p: any) => p.name).includes(parentProtocol.name)) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }

  const getProtocolData = (protocolData: any) => {
    let fetchMini = feMini
    if (feMini) {
      // for child protocols with excluded tokens, we need to fetch the full protocol data
      if (protocolData.excludeTvlFromParent) fetchMini = false
    }
    return craftProtocolV2({ protocolData, useNewChainNames: true, skipAggregatedTvl: false, restrictResponseSize: false, skipFeMiniTransform: true, feMini: fetchMini })
  }

  const hasMisrepresentedTokens = childProtocols.some((i: IProtocol) => i.misrepresentedTokens)

  const childProtocolsTvls: Array<IProtocolResponse> = await Promise.all(childProtocols.filter((i: IProtocol) => !i.excludeTvlFromParent).map(getProtocolData));
  const skipTokenBreakdownData = childProtocolsTvls.some((i: any) => i.skipTokenBreakdownData)

  if (skipTokenBreakdownData) {

    // if we are skipping token breakdown data for any of the child protocols, we remove token breakdown data from all child protocols
    childProtocolsTvls.forEach((protocolTvl) => {

      protocolTvl.tokensInUsd = [];
      protocolTvl.tokens = [];
      Object.keys(protocolTvl?.chainTvls ?? {}).forEach((key) => {
        protocolTvl.chainTvls[key].tokensInUsd = null
        protocolTvl.chainTvls[key].tokens = null
      })
    })
  }

  const debug_t1 = performance.now(); // start the timer

  const res = await craftParentProtocolInternal({ parentProtocol, childProtocolsTvls, skipAggregatedTvl, fetchMcap: getCachedMCap, parentRaises: getRaises(parentProtocol.id) ?? [], feMini, })
  const childNames = cache.otherProtocolsMap[parentProtocol.id] ?? []

  res.otherProtocols = [parentProtocol.name, ...childNames]

  if (hasMisrepresentedTokens) res.misrepresentedTokens = true;

  const debug_totalTime = performance.now() - debug_t0
  const debug_dbTime = debug_t1 - debug_t0
  // sdk.log(`${parentProtocol.name} | T(all): ${(debug_totalTime / 1e3).toFixed(3)}s | T(child) ${(debug_dbTime / 1e3).toFixed(3)}s`)

  return res
}

export async function cachedCraftParentProtocolV2(options: CraftParentProtocolV2Options) {
  const id = `${options.parentProtocol.id}-${options.skipAggregatedTvl ? 'noAgg' : 'agg'}`
  const CACHE_KEY = CACHE_KEYS.PARENT_PROTOCOL
  return cacheAndRespond({ key: CACHE_KEY, id, origFunction: craftParentProtocolV2, args: [options] })
}