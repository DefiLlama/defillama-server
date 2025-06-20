import type { IParentProtocol } from "../../protocols/types";
import { errorResponse } from "../../utils/shared";
import { IProtocolResponse, } from "../../types";
import { craftParentProtocolInternal } from "../../utils/craftParentProtocol";
import { cache, getCachedMCap, CACHE_KEYS, cacheAndRespond, } from "../cache/index";
import { cachedCraftProtocolV2 } from './craftProtocolV2'
import * as sdk from '@defillama/sdk'

type CraftParentProtocolV2Options = {
  parentProtocol: IParentProtocol;
  useHourlyData: boolean;
  skipAggregatedTvl: boolean;
}

export async function craftParentProtocolV2({
  parentProtocol,
  useHourlyData,
  skipAggregatedTvl,
}: CraftParentProtocolV2Options) {
  const debug_t0 = performance.now(); // start the timer
  const childProtocols = cache.childProtocols[parentProtocol.id] ?? []

  if (childProtocols.length < 1 || childProtocols.map((p: any) => p.name).includes(parentProtocol.name)) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }

  const getProtocolData = (protocolData: any) => cachedCraftProtocolV2({ protocolData, useNewChainNames: true, useHourlyData, skipAggregatedTvl: false, restrictResponseSize: false })

  const childProtocolsTvls: Array<IProtocolResponse> = await Promise.all(childProtocols.map(getProtocolData));

  const debug_t1 = performance.now(); // start the timer
  const isHourlyTvl = (tvl: Array<{ date: number }>) =>
    tvl.length < 2 || tvl[1].date - tvl[0].date < 86400 ? true : false;

  const res = await craftParentProtocolInternal({ parentProtocol, childProtocolsTvls, skipAggregatedTvl, isHourlyTvl, fetchMcap: getCachedMCap, parentRaises: [] })
  const childNames = cache.otherProtocolsMap[parentProtocol.id] ?? []

  res.otherProtocols = [parentProtocol.name, ...childNames]

  const debug_totalTime = performance.now() - debug_t0
  const debug_dbTime = debug_t1 - debug_t0
  // sdk.log(`${parentProtocol.name} |${useHourlyData ? 'h' : 'd'} | T(all): ${(debug_totalTime / 1e3).toFixed(3)}s | T(child) ${(debug_dbTime / 1e3).toFixed(3)}s`)

  return res
}

export async function cachedCraftParentProtocolV2(options: CraftParentProtocolV2Options) {
  const id = `${options.parentProtocol.id}-${options.useHourlyData ? 'hourly' : 'daily'}-${options.skipAggregatedTvl ? 'noAgg' : 'agg'}`
  const CACHE_KEY = CACHE_KEYS.PARENT_PROTOCOL
  return cacheAndRespond({ key: CACHE_KEY, id, origFunction: craftParentProtocolV2, args: [options] })
}