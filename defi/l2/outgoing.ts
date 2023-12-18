import protocols, { Protocol } from "../src/protocols/data";
import getTVLOfRecordClosestToTimestamp from "../src/utils/shared/getRecordClosestToTimestamp";
import { getCurrentUnixTimestamp } from "../../high-usage/defiCode/utils/date";
import { DollarValues, McapData, TokenTvlData } from "./types";
import { aggregateChainTokenBalances } from "./utils";
import { canonicalBridgeIds, protocolBridgeIds, zero } from "./constants";
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

  let missingIds: string = ``;
  usdTokenBalances.map((b: any, i: number) => {
    if (!b.SK) missingIds += ` ${canonicalIds[i]},`;
  });

  if (missingIds.length)
    throw new Error(`missing hourlyUsdTokensTvl for ${isProtocol ? "protocol" : "bridge"} IDs: ${missingIds}`);

  return usdTokenBalances;
}

export async function fetchTvls(
  params: {
    timestamp?: number;
    searchWidth?: number;
    isCanonical?: boolean;
    isProtocol?: boolean;
    mcapData?: McapData;
    native?: TokenTvlData;
  } = {}
): Promise<{ data: TokenTvlData; native?: TokenTvlData }> {
  const timestamp: number = params.timestamp ?? getCurrentUnixTimestamp();
  const searchWidth: number = params.searchWidth ?? 10800; // 3hr either side
  const isCanonical: boolean = params.isCanonical ?? false;
  const isProtocol: boolean = params.isProtocol ?? false;
  const dbData = await fetchBridgeUsdTokenTvls(timestamp, searchWidth, isCanonical, isProtocol);

  if (isCanonical) return sortCanonicalBridgeBalances(dbData, isProtocol);
  const aggregate = aggregateChainTokenBalances([dbData]);

  if (params.mcapData && params.native) return addOutgoingToMcapData(aggregate, params.mcapData);
  return { data: aggregate };
}
function sortCanonicalBridgeBalances(
  usdTokenBalances: TokenTvlData[],
  isProtocol: boolean
): { data: TokenTvlData; native?: TokenTvlData } {
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
  return { data: canonicalBridgeTokenBalances };
}
function addOutgoingToMcapData(
  allOutgoing: TokenTvlData,
  allMcapData: McapData
): { data: TokenTvlData; native: TokenTvlData } {
  // use mcap data to find more realistic values on each chain
  Object.keys(allMcapData).map((chain: string) => {
    if (!(chain in allOutgoing) || !(chain in allMcapData)) return;
    Object.keys(allMcapData[chain]).map((symbol: string) => {
      const outgoing = allOutgoing[chain][symbol] ?? zero;
      allMcapData[chain][symbol].outgoing = outgoing;
      const { native: chainMcap, total: fdv } = allMcapData[chain][symbol];
      let interchainMcap = allMcapData.total[symbol].native;
      if (!interchainMcap) {
        const searchKey = Object.keys(allMcapData.total).find((k: string) => k.toLowerCase() == symbol.toLowerCase());
        if (!searchKey) return;
        interchainMcap = allMcapData.total[searchKey].native;
      }
      const percOnThisChain = chainMcap.div(interchainMcap);
      const thisAssetMcap = BigNumber.min(interchainMcap, fdv).times(percOnThisChain);
      allMcapData[chain][symbol].native = thisAssetMcap;
    });
  });

  const adjustedNative: TokenTvlData = {};
  const adjustedOutgoing: TokenTvlData = {};

  // use new mcap data from above to write adjusted chain TVLs
  Object.keys(allMcapData).map((chain: string) => {
    if (!(chain in adjustedOutgoing)) adjustedOutgoing[chain] = {};
    if (!(chain in adjustedNative)) adjustedNative[chain] = {};
    Object.keys(allMcapData[chain]).map((symbol: string) => {
      const { native, outgoing } = allMcapData[chain][symbol];
      adjustedNative[chain][symbol] = native;
      if (outgoing && outgoing != zero) adjustedOutgoing[chain][symbol] = outgoing;
    });
  });

  // fill in the missing outgoings
  Object.keys(allOutgoing).map((chain: string) => {
    if (!(chain in adjustedOutgoing)) return;
    if (!Object.values(canonicalBridgeIds).includes(chain)) return;
    Object.keys(allOutgoing[chain]).map((symbol: string) => {
      if (symbol in adjustedOutgoing[chain]) return;
      adjustedOutgoing[chain][symbol] = allOutgoing[chain][symbol];
    });
  });

  return { data: adjustedOutgoing, native: adjustedNative };
}
