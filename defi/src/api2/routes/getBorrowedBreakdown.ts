import { getChainDisplayName } from "../../utils/normalizeChain";
import { getCachedHistoricalTvlForAllProtocols } from "../../storeGetCharts";
import { getClosestDayStartTimestamp, secondsInHour } from "../../utils/date";
import { _InternalProtocolMetadataMap } from "../../protocols/data";

export async function getBorrowedProtocolBreakdownInternal(rawChain: string | null, params: any = {}) {
  const globalChain = !rawChain || rawChain === "All" ? null : getChainDisplayName(rawChain.toLowerCase(), true);

  let categorySelected: string | undefined = undefined;
  if (params.category) {
    categorySelected = decodeURI(String(params.category)).replace(/_/g, " ");
  }

  const sumDailyBorrowed: { [ts: number]: { [protocol: string]: number } } = {};

  const historicalProtocolTvlsData = await getCachedHistoricalTvlForAllProtocols(
    categorySelected === "Bridge",
    categorySelected === undefined,
    { getHistTvlMeta: params.getHistTvlMeta }
  );
  const { historicalProtocolTvls, lastDailyTimestamp } = historicalProtocolTvlsData;

  historicalProtocolTvls.forEach((protocolTvl: any) => {
    if (!protocolTvl) return;

    const protocolMetadata = _InternalProtocolMetadataMap[protocolTvl.protocol.id];
    if (!protocolMetadata) {
      console.error(`Protocol metadata not found for ${protocolTvl.protocol.id}, skipping it`);
      return;
    }

    if (categorySelected !== undefined && protocolMetadata.category !== categorySelected) {
      return;
    }

    let { historicalTvl, protocol, lastTimestamp } = protocolTvl;

    const lastTvl = historicalTvl[historicalTvl.length - 1];

    while (lastTimestamp < lastDailyTimestamp) {
      lastTimestamp = getClosestDayStartTimestamp(lastTimestamp + 24 * secondsInHour);
      historicalTvl.push({
        ...lastTvl,
        SK: lastTimestamp,
      });
    }

    historicalTvl.forEach((item: any) => {
      let dayBorrowed = 0;

      if (globalChain === null) {
        const v = item.borrowed;
        if (typeof v === "number" && !Number.isNaN(v)) dayBorrowed += v;
      } else {
        const targetKey = `${globalChain}-borrowed`;
        Object.entries(item).forEach(([chainKey, value]) => {
          if (typeof value !== "number" || Number.isNaN(value)) return;
          const chainName = getChainDisplayName(chainKey, true);
          if (chainName === targetKey) {
            dayBorrowed += value as number;
          }
        });
      }

      if (dayBorrowed !== 0) {
        const timestamp = getClosestDayStartTimestamp(item.SK);
        if (!sumDailyBorrowed[timestamp]) sumDailyBorrowed[timestamp] = {};
        sumDailyBorrowed[timestamp][protocol.name] =
          (sumDailyBorrowed[timestamp][protocol.name] ?? 0) + dayBorrowed;
      }
    });
  });

  const timestamps = Object.keys(sumDailyBorrowed)
    .map(Number)
    .sort((a, b) => a - b);

  return timestamps.map((ts) => [ts, sumDailyBorrowed[ts]] as [number, Record<string, number>]);
}
