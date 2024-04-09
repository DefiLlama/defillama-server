import BigNumber from "bignumber.js";
import { getCurrentUnixTimestamp } from "../../high-usage/defiCode/utils/date";
import { excludedTvlKeys, zero } from "./constants";
import fetchStoredTvls from "./outgoing";
import { AllProtocols } from "./types";
import cgSymbols from "../src/utils/symbols/symbols.json";

type ChainTokens = { [chain: string]: { [token: string]: BigNumber } };

const searchWidth = 10800; // 3hr
const period = 86400; // 24hr
const geckoSymbols = cgSymbols as { [key: string]: string };

export async function main(timestamp: number) {
  const [nowRaw, prevRaw, nowUsd, prevUsd] = await Promise.all([
    fetchStoredTvls(timestamp, searchWidth, false, false),
    fetchStoredTvls(timestamp - period, searchWidth, false, false),
    fetchStoredTvls(timestamp, searchWidth, false),
    fetchStoredTvls(timestamp - period, searchWidth, false),
  ]);

  if (nowRaw == null || prevRaw == null || nowUsd == null || prevUsd == null) return;
  const { tokenDiff, prices } = tokenDiffs(nowRaw, prevRaw, nowUsd, prevUsd);
  const tokenUsdFlows = tokenUsds(tokenDiff, prices);
  return tokenUsdFlows;
}

function tokenDiffs(
  nowRaw: AllProtocols,
  prevRaw: AllProtocols,
  nowUsd: AllProtocols,
  prevUsd: AllProtocols
): { tokenDiff: ChainTokens; prices: ChainTokens } {
  const tokenDiff: ChainTokens = {};
  const prices: ChainTokens = {};
  Object.keys(nowRaw).map((bridgeId: string) => {
    Object.keys(nowRaw[bridgeId]).map((chain: string) => {
      if (excludedTvlKeys.includes(chain)) return;
      if (!(chain in tokenDiff)) tokenDiff[chain] = {};
      if (!(chain in prices)) prices[chain] = {};

      Object.keys(nowRaw[bridgeId][chain]).map((rawSymbol: string) => {
        const current = BigNumber(nowRaw[bridgeId][chain][rawSymbol]);
        const symbol = geckoSymbols[rawSymbol] ?? rawSymbol;
        if (!(symbol in tokenDiff[chain])) tokenDiff[chain][symbol] = zero;
        tokenDiff[chain][symbol] = tokenDiff[chain][symbol].plus(current);
        if (prices[chain][symbol]) return;
        prices[chain][symbol] = BigNumber(nowUsd[bridgeId][chain][rawSymbol]).div(current);
      });

      Object.keys(prevRaw[bridgeId][chain]).map((rawSymbol: string) => {
        const prev = BigNumber(prevRaw[bridgeId][chain][rawSymbol]);
        const symbol = geckoSymbols[rawSymbol] ?? rawSymbol;
        if (symbol in nowRaw[bridgeId][chain]) return;
        if (!(symbol in tokenDiff[chain])) tokenDiff[chain][symbol] = zero;
        tokenDiff[chain][symbol] = tokenDiff[chain][symbol].minus(BigNumber(prev));
        if (prices[chain][symbol]) return;
        prices[chain][symbol] = BigNumber(prevUsd[bridgeId][chain][rawSymbol]).div(prev);
      });
    });
  });

  return { tokenDiff, prices };
}
function tokenUsds(qtys: ChainTokens, prices: ChainTokens) {
  const tokenDiff: ChainTokens = {};

  Object.keys(qtys).map((chain: string) => {
    if (!(chain in tokenDiff)) tokenDiff[chain] = {};
    Object.keys(qtys[chain]).map((symbol: string) => {
      tokenDiff[chain][symbol] = qtys[chain][symbol].times(prices[chain][symbol]);
    });
  });

  return tokenDiff;
}
const timestamp = getCurrentUnixTimestamp();
main(timestamp); // ts-node defi/l2/flows.ts
