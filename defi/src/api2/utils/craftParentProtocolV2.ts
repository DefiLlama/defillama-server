import type { IParentProtocol } from "../../protocols/types";
import { errorResponse } from "../../utils/shared";
import { IProtocolResponse,  } from "../../types";
import sluggify from "../../utils/sluggify";
import fetch from "node-fetch";
import { getCachedMCap, cache } from "../cache";
import { craftParentProtocolInternal } from "../../utils/craftParentProtocol";

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

  const PROTOCOL_API = useHourlyData
    ? "https://api.llama.fi/hourly"
    : "https://api.llama.fi/updatedProtocol";

  const childProtocolsTvls: Array<IProtocolResponse> = await Promise.all(
    childProtocols.map((protocolData: any) =>
      fetch(`${PROTOCOL_API}/${sluggify(protocolData)}?includeAggregatedTvl=true`).then((res) => res.json())
    )
  );

  const isHourlyTvl = (tvl: Array<{ date: number }>) =>
    tvl.length < 2 || tvl[1].date - tvl[0].date < 86400 ? true : false;

  return craftParentProtocolInternal({ parentProtocol, childProtocolsTvls, skipAggregatedTvl, isHourlyTvl, fetchMcap: getCachedMCap })
}
