import BigNumber from "bignumber.js";
import { excludedTvlKeys, geckoSymbols, zero } from "./constants";
import fetchStoredTvls from "./outgoing";
import { AllProtocols, ChainTokens } from "./types";

const searchWidth = 10800; // 3hr
const period = 86400; // 24hr

export default async function main(timestamp: number): Promise<ChainTokens> {
  const [nowRaw, prevRaw, nowUsd, prevUsd] = await Promise.all([
    fetchStoredTvls(timestamp, searchWidth, false, false),
    fetchStoredTvls(timestamp - period, searchWidth, false, false),
    fetchStoredTvls(timestamp, searchWidth, false),
    fetchStoredTvls(timestamp - period, searchWidth, false),
  ]);

  if (nowRaw == null || prevRaw == null || nowUsd == null || prevUsd == null)
    throw new Error(`TVL data missing for flows at ${timestamp}`);
  const { tokenDiff, prices } = tokenDiffs(nowRaw, prevRaw, nowUsd, prevUsd);
  return tokenUsds(tokenDiff, prices);
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
      if (excludedTvlKeys.includes(chain) || chain.includes("staking") || chain.includes("pool2")) return;
      if (!(chain in tokenDiff)) tokenDiff[chain] = {};
      if (!(chain in prices)) prices[chain] = {};

      Object.keys(nowRaw[bridgeId][chain]).map((rawSymbol: string) => {
        const current = BigNumber(nowRaw[bridgeId][chain][rawSymbol]);
        const symbol = geckoSymbols[rawSymbol.replace("coingecko:", "")] ?? rawSymbol.toUpperCase();
        if (!(symbol in tokenDiff[chain])) tokenDiff[chain][symbol] = zero;
        tokenDiff[chain][symbol] = tokenDiff[chain][symbol].plus(current);
        if (prices[chain][symbol]) return;
        prices[chain][symbol] = BigNumber(nowUsd[bridgeId][chain][rawSymbol]).div(current);
      });

      Object.keys(prevRaw[bridgeId][chain]).map((rawSymbol: string) => {
        const prev = BigNumber(prevRaw[bridgeId][chain][rawSymbol]);
        const symbol = geckoSymbols[rawSymbol.replace("coingecko:", "")] ?? rawSymbol.toUpperCase();
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
    let sortable: [string, BigNumber][] = [];

    for (const symbol in qtys[chain]) {
      sortable.push([symbol, qtys[chain][symbol].times(prices[chain][symbol])]);
    }
    sortable.sort(function (a: any[], b: any[]) {
      return b[1] - a[1];
    });

    for (let i = 0; i < Math.min(sortable.length, 50); i++) {
      const [symbol, value] = sortable[i];
      tokenDiff[chain][symbol] = value.decimalPlaces(2);
    }
  });

  return tokenDiff;
}
