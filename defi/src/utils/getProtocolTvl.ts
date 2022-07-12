import { Protocol } from "../protocols/data";
import type { TvlsByChain, ProtocolTvls } from "../types";
import { secondsInDay, secondsInWeek } from "./date";
import { getLastRecord, hourlyTvl } from "./getLastRecord";
import { importAdapter } from "./imports/importAdapter";
import {
  extraSections,
  getChainDisplayName,
  nonChains,
} from "./normalizeChain";
import getTVLOfRecordClosestToTimestamp from "./shared/getRecordClosestToTimestamp";

export async function getProtocolTvl(
  protocol: Readonly<Protocol>,
  useNewChainNames: boolean
): Promise<ProtocolTvls> {
  const chainTvls: TvlsByChain = {};
  let tvl: number | null = null;
  let tvlPrevDay: number | null = null;
  let tvlPrevWeek: number | null = null;
  let tvlPrevMonth: number | null = null;

  try {
    const now = Math.round(Date.now() / 1000);
    const [
      lastRecord,
      previousDayRecord,
      previousWeekRecord,
      previousMonthRecord,
      module,
    ] = await Promise.all([
      getLastRecord(hourlyTvl(protocol.id)),
      getTVLOfRecordClosestToTimestamp(
        hourlyTvl(protocol.id),
        now - secondsInDay,
        secondsInDay
      ),
      getTVLOfRecordClosestToTimestamp(
        hourlyTvl(protocol.id),
        now - secondsInWeek,
        secondsInDay
      ),
      getTVLOfRecordClosestToTimestamp(
        hourlyTvl(protocol.id),
        now - secondsInWeek * 4,
        secondsInDay
      ),
      importAdapter(protocol),
    ]);

    const isDoubleCount =
      module.doublecounted ??
      (protocol.category === "Yield Aggregator" ||
        protocol.category === "Yield");

    if (lastRecord) {
      Object.entries(lastRecord).forEach(([chain, chainTvl]) => {
        if (chain !== "tvl" && nonChains.includes(chain)) {
          return;
        }

        if (chain === "tvl") {
          tvl = chainTvl;
          tvlPrevDay = previousDayRecord[chain] || null;
          tvlPrevWeek = previousWeekRecord[chain] || null;
          tvlPrevMonth = previousMonthRecord[chain] || null;

          if (isDoubleCount) {
            chainTvls["doublecounted"] = {
              tvl,
              tvlPrevDay,
              tvlPrevWeek,
              tvlPrevMonth,
            };
          }
        } else {
          const chainDisplayName = getChainDisplayName(chain, useNewChainNames);
          chainTvls[chainDisplayName] = {
            tvl: chainTvl,
            tvlPrevDay: previousDayRecord[chain] || null,
            tvlPrevWeek: previousWeekRecord[chain] || null,
            tvlPrevMonth: previousMonthRecord[chain] || null,
          };

          if (
            isDoubleCount &&
            !extraSections.includes(chainDisplayName) &&
            !chainDisplayName.includes("-")
          ) {
            chainTvls[`${chainDisplayName}-doublecounted`] = {
              tvl: chainTvl,
              tvlPrevDay: previousDayRecord[chain] || null,
              tvlPrevWeek: previousWeekRecord[chain] || null,
              tvlPrevMonth: previousMonthRecord[chain] || null,
            };
          }
        }
      });

      const chainsLength = Object.keys(chainTvls).length;
      if (
        chainsLength === 0 ||
        (chainsLength === 1 && chainTvls["doublecounted"] !== undefined)
      ) {
        chainTvls[protocol.chains[0]] = {
          tvl,
          tvlPrevDay,
          tvlPrevWeek,
          tvlPrevMonth,
        };

        if (chainTvls["doublecounted"]) {
          chainTvls[`${protocol.chains[0]}-doublecounted`] = {
            ...chainTvls["doublecounted"],
          };
        }
      }
    }
  } catch (error) {
    console.log(error);
  } finally {
    return { tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth, chainTvls };
  }
}
