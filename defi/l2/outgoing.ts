import getTVLOfRecordClosestToTimestamp from "../src/utils/shared/getRecordClosestToTimestamp";
import { getCurrentUnixTimestamp } from "../src/utils/date";
import { AllProtocols, DollarValues, McapData, TokenTvlData } from "./types";
import { aggregateChainTokenBalances } from "./utils";
import { canonicalBridgeIds, chainsWithoutCanonicalBridges, geckoSymbols, protocolBridgeIds, zero } from "./constants";
import BigNumber from "bignumber.js";

let allProtocols: AllProtocols = {};

export default async function fetchBridgeUsdTokenTvls(
  timestamp: number,
  searchWidth: number,
  persist: boolean = true,
  usd: boolean = true,
  excludedIds: string[] = []
): Promise<AllProtocols | void> {
  const allProtocolsTemp: AllProtocols = persist ? allProtocols : {};
  if (Object.keys(allProtocolsTemp).length) return;
  const ids: string[] = [...Object.keys(canonicalBridgeIds), ...Object.keys(protocolBridgeIds)];
  const filteredIds: string[] = [];
  ids.map((i: string) => (excludedIds.includes(i) ? [] : filteredIds.push(i)));
  const tokenBalances: any[] = await Promise.all(
    filteredIds.map((i: string) =>
      getTVLOfRecordClosestToTimestamp(`hourly${usd ? "Usd" : ""}TokensTvl#${i}`, timestamp, searchWidth)
    )
  );

  let errorString = `missing hourly${usd ? "Usd" : ""}TokensTvl for ids`;
  let throwError = false;
  filteredIds.map((id: string, i: number) => {
    if (tokenBalances[i].SK == null) {
      errorString = `${errorString} ${id}`;
      throwError = true;
    } else allProtocolsTemp[id] = tokenBalances[i];
  });

  if (throwError) throw new Error(errorString);
  if (persist) allProtocols = allProtocolsTemp;
  return allProtocolsTemp;
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
  const searchWidth: number = params.searchWidth ?? (params.timestamp ? 43200 : 10800); // 12,3hr either side
  const isCanonical: boolean = params.isCanonical ?? false;
  const isProtocol: boolean = params.isProtocol ?? false;
  await fetchBridgeUsdTokenTvls(timestamp, searchWidth);

  if (isCanonical) return sortCanonicalBridgeBalances(isProtocol);
  const aggregate = aggregateChainTokenBalances(allProtocols);

  if (params.mcapData && params.native) return addOutgoingToMcapData(aggregate, params.mcapData);
  return { data: aggregate };
}

function sortCanonicalBridgeBalances(isProtocol: boolean): { data: TokenTvlData; native?: TokenTvlData } {
  const ids = isProtocol ? protocolBridgeIds : canonicalBridgeIds;
  const canonicalBridgeTokenBalances: TokenTvlData = {};

  Object.keys(ids).map((id: string) => {
    const data: TokenTvlData | undefined = allProtocols[id];
    if (!data) return;

    const bigNumberBalances: DollarValues = {};
    Object.keys(data.tvl).map((s: string) => {
      const symbol = geckoSymbols[s.replace("coingecko:", "")] ?? s.toUpperCase();
      bigNumberBalances[symbol] = BigNumber(data.tvl[s]);
    });
    if (data.staking) {
      Object.keys(data.staking).map((s: string) => {
        const symbol = geckoSymbols[s.replace("coingecko:", "")] ?? s.toUpperCase();
        bigNumberBalances[symbol] = BigNumber(data.staking[s]);
      });
    }

    canonicalBridgeTokenBalances[ids[id]] = bigNumberBalances;
  });

  chainsWithoutCanonicalBridges.map((chain: string) => {
    canonicalBridgeTokenBalances[chain] = {};
  });

  return { data: canonicalBridgeTokenBalances };
}

function sortChains(chains: string[]) {
  const index = chains.indexOf("total");
  chains.splice(index, 1);
  chains.push("total");
  return chains;
}

function addOutgoingToMcapData(
  allOutgoing: TokenTvlData,
  allMcapData: McapData
): { data: TokenTvlData; native: TokenTvlData } {
  // use mcap data to find more realistic values on each chain
  const chains = sortChains(Object.keys(allMcapData));
  chains.map((chain: string) => {
    if (!(chain in allMcapData)) return;
    Object.keys(allMcapData[chain]).map((symbol: string) => {
      const outgoing = chain in allOutgoing ? allOutgoing[chain][symbol] ?? zero : zero;
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
  chains.map((chain: string) => {
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
    Object.keys(allOutgoing[chain]).map((symbol: string) => {
      if (symbol in adjustedOutgoing[chain]) return;
      adjustedOutgoing[chain][symbol] = allOutgoing[chain][symbol];
    });
  });

  return { data: adjustedOutgoing, native: adjustedNative };
}
