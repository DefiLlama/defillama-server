import type { IParentProtocol } from "../../protocols/types";
import { errorResponse } from "../../utils/shared";
import { IProtocolResponse, } from "../../types";
import { getCachedMCap, cache } from "../cache";
import { craftParentProtocolInternal } from "../../utils/craftParentProtocol";
import craftProtocolV2 from './craftProtocolV2'

export default async function craftParentProtocol({
  parentProtocol,
  useHourlyData,
  skipAggregatedTvl,
}: {
  parentProtocol: IParentProtocol;
  useHourlyData: boolean;
  skipAggregatedTvl: boolean;
}) {
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
