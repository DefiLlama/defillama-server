import protocols, { Protocol } from "../src/protocols/data";
import getTVLOfRecordClosestToTimestamp from "../src/utils/shared/getRecordClosestToTimestamp";
import { getCurrentUnixTimestamp } from "../../high-usage/defiCode/utils/date";
import { DollarValues, TokenTvlData } from "./types";
import { aggregateChainTokenBalances } from "./utils";
import { canonicalBridgeIds, protocolBridgeIds } from "./constants";
import BigNumber from "bignumber.js";

export default async function fetchBridgeUsdTokenTvls(
  timestamp: number,
  searchWidth: number,
  isCanonical: boolean,
  isProtocol: boolean
): Promise<TokenTvlData[]> {
  const canonicalIds = Object.keys(isProtocol ? protocolBridgeIds : canonicalBridgeIds);
  const alBridgeProtocols: Protocol[] = isProtocol
    ? protocols
    : protocols.filter((p: Protocol) => p.category?.toLowerCase() == "bridge" || p.category?.toLowerCase() == "chain");
  const bridgeProtocols = alBridgeProtocols.filter((p: Protocol) =>
    isCanonical ? canonicalIds.includes(p.id) : !canonicalIds.includes(p.id)
  );
  const usdTokenBalances: TokenTvlData[] = await Promise.all(
    bridgeProtocols.map((b: Protocol) =>
      getTVLOfRecordClosestToTimestamp(`hourlyUsdTokensTvl#${b.id}`, timestamp, searchWidth)
    )
  );

  const missingProtocolTvlsLength = bridgeProtocols.length - usdTokenBalances.length;
  if (missingProtocolTvlsLength) throw new Error(`missing hourlyUsdTokensTvl for ${missingProtocolTvlsLength} bridges`);

  return usdTokenBalances;
}

export async function fetchOutgoing(
  params: { timestamp?: number; searchWidth?: number; isCanonical?: boolean; isProtocol?: boolean } = {}
): Promise<TokenTvlData> {
  const timestamp: number = params.timestamp ?? getCurrentUnixTimestamp();
  const searchWidth: number = params.searchWidth ?? 10800; // 3hr either side
  const isCanonical: boolean = params.isCanonical ?? false;
  const isProtocol: boolean = params.isProtocol ?? false;
  const dbData = await fetchBridgeUsdTokenTvls(timestamp, searchWidth, isCanonical, isProtocol);
  return isCanonical ? sortCanonicalBridgeBalances(dbData, isProtocol) : aggregateChainTokenBalances([dbData]);
}
function sortCanonicalBridgeBalances(usdTokenBalances: TokenTvlData[], isProtocol: boolean): TokenTvlData {
  const ids = isProtocol ? protocolBridgeIds : canonicalBridgeIds;
  const canonicalBridgeTokenBalances: TokenTvlData = {};
  Object.keys(ids).map((id: string) => {
    const data: TokenTvlData | undefined = usdTokenBalances.find((d: any) => d.PK == `hourlyUsdTokensTvl#${id}`);
    if (!data) return;

    const bigNumberBalances: DollarValues = {};
    Object.keys(data.tvl).map((s: string) => {
      bigNumberBalances[s] = BigNumber(data.tvl[s]);
    });

    canonicalBridgeTokenBalances[ids[id]] = bigNumberBalances;
  });
  return canonicalBridgeTokenBalances;
}
