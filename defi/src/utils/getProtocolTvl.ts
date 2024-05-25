import { Protocol } from "../protocols/data";
import type { ITvlsWithChangesByChain, ProtocolTvls } from "../types";
import { secondsInDay, secondsInMonth, secondsInWeek } from "./date";
import { getLastRecord, hourlyTvl, hourlyUsdTokensTvl } from "./getLastRecord";
import { importAdapter } from "./imports/importAdapter";
import {
  extraSections,
  getChainDisplayName,
  isDoubleCounted,
  nonChains,
} from "./normalizeChain";
import getTVLOfRecordClosestToTimestamp from "./shared/getRecordClosestToTimestamp";

const _getLastHourlyRecord = (protocol: Protocol) => getLastRecord(hourlyTvl(protocol.id))
const _getLastHourlyTokensUsd = (protocol: Protocol) => getLastRecord(hourlyUsdTokensTvl(protocol.id))
const _getYesterdayTokensUsd = (protocol: Protocol) => getTVLOfRecordClosestToTimestamp(hourlyUsdTokensTvl(protocol.id), Math.round(Date.now() / 1000) - secondsInDay, secondsInDay)
const _getLastWeekTokensUsd = (protocol: Protocol) => getTVLOfRecordClosestToTimestamp(hourlyUsdTokensTvl(protocol.id), Math.round(Date.now() / 1000) - secondsInWeek, secondsInDay)
const _getLastMonthTokensUsd = (protocol: Protocol) => getTVLOfRecordClosestToTimestamp(hourlyUsdTokensTvl(protocol.id), Math.round(Date.now() / 1000) - secondsInMonth, secondsInDay)
const _getYesterdayTvl = (protocol: Protocol) => getTVLOfRecordClosestToTimestamp(hourlyTvl(protocol.id), Math.round(Date.now() / 1000) - secondsInDay, secondsInDay)
const _getLastWeekTvl = (protocol: Protocol) => getTVLOfRecordClosestToTimestamp(hourlyTvl(protocol.id), Math.round(Date.now() / 1000) - secondsInWeek, secondsInDay)
const _getLastMonthTvl = (protocol: Protocol) => getTVLOfRecordClosestToTimestamp(hourlyTvl(protocol.id), Math.round(Date.now() / 1000) - secondsInMonth, secondsInDay)

const includeSection = (chainDisplayName:string)=> !extraSections.includes(chainDisplayName) && !chainDisplayName.includes("-")

export async function getProtocolTvl(
  protocol: Readonly<Protocol>,
  useNewChainNames: boolean, {
    getLastHourlyRecord = _getLastHourlyRecord,
    getLastHourlyTokensUsd = _getLastHourlyTokensUsd,
    getYesterdayTokensUsd = _getYesterdayTokensUsd,
    getLastWeekTokensUsd = _getLastWeekTokensUsd,
    getLastMonthTokensUsd = _getLastMonthTokensUsd,
    getYesterdayTvl = _getYesterdayTvl,
    getLastWeekTvl = _getLastWeekTvl,
    getLastMonthTvl = _getLastMonthTvl,
  } = {}): Promise<ProtocolTvls> {
  const chainTvls: ITvlsWithChangesByChain = {};
  let tvl: number | null = null;
  let tvlPrevDay: number | null = null;
  let tvlPrevWeek: number | null = null;
  let tvlPrevMonth: number | null = null;

  try {
    const [
      lastRecord,
      previousDayRecord,
      previousWeekRecord,
      previousMonthRecord,
      module,
      usdTokens
    ] = await Promise.all([
      getLastHourlyRecord(protocol),
      getYesterdayTvl(protocol),
      getLastWeekTvl(protocol),
      getLastMonthTvl(protocol),
      importAdapter(protocol),
      protocol.tokensExcludedFromParent !== undefined ? Promise.all(
        [getLastHourlyTokensUsd(protocol),getYesterdayTokensUsd(protocol),getLastWeekTokensUsd(protocol),getLastMonthTokensUsd(protocol)]
        ) :null
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

          if (protocol.category !== "Bridge" && protocol.category !== "RWA" && protocol.category !== "Basis Trading" ) {
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
            includeSection(chainDisplayName) &&
            protocol.category !== "Bridge" && protocol.category !== "RWA"
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

        if (usdTokens !== null && usdTokens[0] !== undefined) {
          const chainDisplayName = getChainDisplayName(chain, useNewChainNames)
          if (chain === "tvl" || includeSection(chainDisplayName)) {
            function getExcludedTvl(usdTokensSection:any){
              if(typeof usdTokensSection !== "object"){
                return 0
              }
              return Object.entries(usdTokensSection).reduce((sum, token) => {
                if (protocol.tokensExcludedFromParent?.includes(token[0].toUpperCase())) {
                  sum += token[1] as number
                }
                return sum
              }, 0)
            }
            chainTvls[chain === "tvl" ? "excludeParent" : `${chainDisplayName}-excludeParent`] = {
              tvl: getExcludedTvl(usdTokens[0]?.[chain]),
              tvlPrevDay: getExcludedTvl(usdTokens[1]?.[chain]),
              tvlPrevWeek: getExcludedTvl(usdTokens[2]?.[chain]),
              tvlPrevMonth: getExcludedTvl(usdTokens[3]?.[chain]),
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
