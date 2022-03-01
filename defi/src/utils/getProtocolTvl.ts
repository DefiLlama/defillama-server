import { Protocol } from "../protocols/data";
import { secondsInDay, secondsInWeek } from "./date";
import { getLastRecord, hourlyTvl } from "./getLastRecord";
import { extraSections, getChainDisplayName, nonChains } from "./normalizeChain";
import getTVLOfRecordClosestToTimestamp from "./shared/getRecordClosestToTimestamp";

type ChainTvls = {
  [key: string]: {
    tvl: number | null;
    tvlPrevDay: number | null;
    tvlPrevWeek: number | null;
    tvlPrevMonth: number | null;
  };
};

export type ProtocolTvls = {
  tvl: number | null;
  tvlPrevDay: number | null;
  tvlPrevWeek: number | null;
  tvlPrevMonth: number | null;
  chainTvls: ChainTvls;
};

export async function getProtocolTvl(protocol: Readonly<Protocol>, useNewChainNames: boolean): Promise<ProtocolTvls> {
  const now = Math.round(Date.now() / 1000);
  const [lastRecord, previousDayRecord, previousWeekRecord, previousMonthRecord, module] = await Promise.all([
    getLastRecord(hourlyTvl(protocol.id)),
    getTVLOfRecordClosestToTimestamp(hourlyTvl(protocol.id), now - secondsInDay, secondsInDay),
    getTVLOfRecordClosestToTimestamp(hourlyTvl(protocol.id), now - secondsInWeek, secondsInDay),
    getTVLOfRecordClosestToTimestamp(hourlyTvl(protocol.id), now - secondsInWeek * 4, secondsInDay),
    import(`../../DefiLlama-Adapters/projects/${protocol.module}`),
  ]);

  const chainTvls: ChainTvls = {};
  let tvl: number | null = null;
  let tvlPrevDay: number | null = null;
  let tvlPrevWeek: number | null = null;
  let tvlPrevMonth: number | null = null;

  const isDoubleCount = module.doublecounted || protocol.category === "Yield Aggregator";

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

        if (isDoubleCount && !extraSections.includes(chainDisplayName) && !chainDisplayName.includes("-")) {
          chainTvls[`${chainDisplayName}-doublecounted`] = {
            tvl,
            tvlPrevDay,
            tvlPrevWeek,
            tvlPrevMonth,
          };
        }
      }
    });

    if (Object.keys(chainTvls).length === 0) {
      chainTvls[protocol.chains[0]] = {
        tvl,
        tvlPrevDay,
        tvlPrevWeek,
        tvlPrevMonth,
      };
    }
  }

  return { tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth, chainTvls };
}
