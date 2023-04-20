import { Protocol } from "../protocols/data";
import type { ITvlsWithChangesByChain, ProtocolTvls } from "../types";
import { secondsInDay, secondsInWeek } from "./date";
import { getLastRecord, hourlyTvl } from "./getLastRecord";
import { importAdapter } from "./imports/importAdapter";
import {
  extraSections,
  getChainDisplayName,
  isDoubleCounted,
  nonChains,
} from "./normalizeChain";
import getTVLOfRecordClosestToTimestamp from "./shared/getRecordClosestToTimestamp";

export async function getProtocolTvl(
  protocol: Readonly<Protocol>,
  useNewChainNames: boolean
): Promise<ProtocolTvls> {
  const chainTvls: ITvlsWithChangesByChain = {};
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

    const isDoubleCount = isDoubleCounted(module.doublecounted, protocol.category);

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

          if (protocol.category?.toLowerCase() === "liquid staking") {
            chainTvls["liquidstaking"] = {
              tvl,
              tvlPrevDay,
              tvlPrevWeek,
              tvlPrevMonth,
            };
          }

          if (
            protocol.category?.toLowerCase() === "liquid staking" &&
            isDoubleCount
          ) {
            chainTvls["dcAndLsOverlap"] = {
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
            !extraSections.includes(chainDisplayName) &&
            !chainDisplayName.includes("-")
          ) {
            if (isDoubleCount) {
              chainTvls[`${chainDisplayName}-doublecounted`] = {
                tvl: chainTvl,
                tvlPrevDay: previousDayRecord[chain] || null,
                tvlPrevWeek: previousWeekRecord[chain] || null,
                tvlPrevMonth: previousMonthRecord[chain] || null,
              };
            }

            if (protocol.category?.toLowerCase() === "liquid staking") {
              chainTvls[`${chainDisplayName}-liquidstaking`] = {
                tvl: chainTvl,
                tvlPrevDay: previousDayRecord[chain] || null,
                tvlPrevWeek: previousWeekRecord[chain] || null,
                tvlPrevMonth: previousMonthRecord[chain] || null,
              };
            }

            if (
              protocol.category?.toLowerCase() === "liquid staking" &&
              isDoubleCount
            ) {
              chainTvls[`${chainDisplayName}-dcAndLsOverlap`] = {
                tvl: chainTvl,
                tvlPrevDay: previousDayRecord[chain] || null,
                tvlPrevWeek: previousWeekRecord[chain] || null,
                tvlPrevMonth: previousMonthRecord[chain] || null,
              };
            }
          }
        }
      });

      const chainsLength = Object.keys(chainTvls).length;

      let allTvlsAreAddl = false;

      Object.keys(chainTvls).forEach((type) => {
        allTvlsAreAddl =
          type === "doublecounted" ||
          type === "liquidstaking" ||
          type === "dcAndLsOverlap";
      });

      if (chainsLength === 0 || (chainsLength <= 3 && allTvlsAreAddl)) {
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
        if (chainTvls["liquidstaking"]) {
          chainTvls[`${protocol.chains[0]}-liquidstaking`] = {
            ...chainTvls["liquidstaking"],
          };
        }
        if (chainTvls["dcAndLsOverlap"]) {
          chainTvls[`${protocol.chains[0]}-dcAndLsOverlap`] = {
            ...chainTvls["dcAndLsOverlap"],
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
