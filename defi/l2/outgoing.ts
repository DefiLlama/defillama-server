import protocols, { Protocol } from "../src/protocols/data";
import getTVLOfRecordClosestToTimestamp from "../src/utils/shared/getRecordClosestToTimestamp";
import { getCurrentUnixTimestamp } from "../../high-usage/defiCode/utils/date";
import { TokenTvlData } from "./types";
import { aggregateChainTokenBalances } from "./utils";

export default async function fetchBridgeUsdTokenTvls(timestamp: number, searchWidth: number): Promise<TokenTvlData[]> {
  const bridgeProtocols: Protocol[] = protocols
    .filter((p: Protocol) => p.category?.toLowerCase() == "bridge")
    .slice(0, 5);
  const usdTokenBalances: TokenTvlData[] = await Promise.all(
    bridgeProtocols.map((b: Protocol) =>
      getTVLOfRecordClosestToTimestamp(`hourlyUsdTokensTvl#${b.id}`, timestamp, searchWidth)
    )
  );

  const missingProtocolTvlsLength = bridgeProtocols.length - usdTokenBalances.length;
  if (missingProtocolTvlsLength) throw new Error(`missing hourlyUsdTokensTvl for ${missingProtocolTvlsLength} bridges`);

  return usdTokenBalances;
}

export async function outgoing(params: { timestamp?: number; searchWidth?: number } = {}) {
  const timestamp: number = params.timestamp ?? getCurrentUnixTimestamp();
  const searchWidth: number = params.searchWidth ?? 10800; // 3hr either side
  const dbData = await fetchBridgeUsdTokenTvls(timestamp, searchWidth);
  const tokenTvls = aggregateChainTokenBalances([dbData]);
  return tokenTvls;
}
