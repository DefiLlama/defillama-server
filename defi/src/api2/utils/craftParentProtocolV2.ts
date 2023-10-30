import type { IParentProtocol } from "../../protocols/types";
import { errorResponse } from "../../utils/shared";
import { IProtocolResponse, } from "../../types";
import { craftParentProtocolInternal } from "../../utils/craftParentProtocol";
import { cache, getCachedMCap, CACHE_KEYS, getCacheByCacheKey, setCacheByCacheKey, } from "../cache";
import craftProtocolV2 from './craftProtocolV2'

type CraftParentProtocolV2Options = {
  parentProtocol: IParentProtocol;
  useHourlyData: boolean;
  skipAggregatedTvl: boolean;
}

export default async function craftParentProtocol({
  parentProtocol,
  useHourlyData,
  skipAggregatedTvl,
}: CraftParentProtocolV2Options) {
  const childProtocols = cache.childProtocols[parentProtocol.id] ?? []

  if (childProtocols.length < 1 || childProtocols.map((p: any) => p.name).includes(parentProtocol.name)) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }

  const getProtocolData = (protocolData: any) => craftProtocolV2({ protocolData, useNewChainNames: true, useHourlyData, skipAggregatedTvl: false, })

  const childProtocolsTvls: Array<IProtocolResponse> = await Promise.all(childProtocols.map(getProtocolData));

  const isHourlyTvl = (tvl: Array<{ date: number }>) =>
    tvl.length < 2 || tvl[1].date - tvl[0].date < 86400 ? true : false;

  return craftParentProtocolInternal({ parentProtocol, childProtocolsTvls, skipAggregatedTvl, isHourlyTvl, fetchMcap: getCachedMCap })
}

export async function cachedCraftParentProtocolV2(options: CraftParentProtocolV2Options) {
  const id = `${options.parentProtocol.id}-${options.useHourlyData ? 'hourly' : 'daily'}-${options.skipAggregatedTvl ? 'noAgg' : 'agg'}`
  if (!getCacheByCacheKey(CACHE_KEYS.PARENT_PROTOCOL, id))
    setCacheByCacheKey(CACHE_KEYS.PARENT_PROTOCOL, id, craftParentProtocol(options))
  return getCacheByCacheKey(CACHE_KEYS.PARENT_PROTOCOL, id)
}