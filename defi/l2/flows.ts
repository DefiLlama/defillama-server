import BigNumber from "bignumber.js";
import { canonicalBridgeIds, excludedTvlKeys, geckoSymbols, zero } from "./constants";
import fetchStoredTvls from "./outgoing";
import { AllProtocols, ChainTokens } from "./types";
import { getChainDisplayName } from "../src/utils/normalizeChain";

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
  let tokenDiff: ChainTokens = {};
  const prices: ChainTokens = {};
  Object.keys(nowRaw).map((bridgeId: string) => {
    Object.keys(nowRaw[bridgeId]).map((chain: string) => {
      if (excludedTvlKeys.includes(chain) || chain.includes("staking") || chain.includes("pool2")) return;
      if (!prevRaw[bridgeId] || !prevRaw[bridgeId][chain]) return;

      if (!(chain in tokenDiff)) tokenDiff[chain] = {};
      if (!(chain in prices)) prices[chain] = {};

      if (bridgeId in canonicalBridgeIds) {
        const destinationChain = canonicalBridgeIds[bridgeId];
        if (!(destinationChain in tokenDiff)) tokenDiff[destinationChain] = {};
        if (!(destinationChain in prices)) prices[destinationChain] = {};
      }

      function add(symbol: string, chain: string, value: BigNumber, plus: boolean) {
        if (!(symbol in tokenDiff[chain])) tokenDiff[chain][symbol] = zero;
        tokenDiff[chain][symbol] = plus ? tokenDiff[chain][symbol].plus(value) : tokenDiff[chain][symbol].minus(value);
      }

      Object.keys(nowRaw[bridgeId][chain]).map((rawSymbol: string) => {
        const current = BigNumber(nowRaw[bridgeId][chain][rawSymbol]);
        const symbol = geckoSymbols[rawSymbol.replace("coingecko:", "")] ?? rawSymbol.toUpperCase();
        add(symbol, chain, current, false); // less on bridge = increase on base chain, decrease on canon
        if (bridgeId in canonicalBridgeIds) {
          const destinationChain = canonicalBridgeIds[bridgeId];
          add(symbol, destinationChain, current, true);
          if (!prices[destinationChain][symbol])
            prices[destinationChain][symbol] = BigNumber(nowUsd[bridgeId][chain][rawSymbol]).div(current);
        }

        if (prices[chain][symbol]) return;
        prices[chain][symbol] = BigNumber(nowUsd[bridgeId][chain][rawSymbol]).div(current);
      });

      Object.keys(prevRaw[bridgeId][chain]).map((rawSymbol: string) => {
        const prev = BigNumber(prevRaw[bridgeId][chain][rawSymbol]);
        const symbol = geckoSymbols[rawSymbol.replace("coingecko:", "")] ?? rawSymbol.toUpperCase();
        add(symbol, chain, prev, true);
        if (bridgeId in canonicalBridgeIds) {
          const destinationChain = canonicalBridgeIds[bridgeId];
          add(symbol, canonicalBridgeIds[bridgeId], prev, false);
          if (!prices[destinationChain][symbol])
            prices[destinationChain][symbol] = BigNumber(prevUsd[bridgeId][chain][rawSymbol]).div(prev);
        }

        if (prices[chain][symbol]) return;
        prices[chain][symbol] = BigNumber(prevUsd[bridgeId][chain][rawSymbol]).div(prev);
      });
    });
  });

  Object.keys(tokenDiff).map((chain: string) =>
    Object.keys(tokenDiff[chain]).map((symbol: string) => {
      if (!tokenDiff[chain][symbol].isEqualTo(zero)) return;
      delete tokenDiff[chain][symbol];
    })
  );
  return { tokenDiff, prices };
}
function tokenUsds(qtys: ChainTokens, prices: ChainTokens) {
  const tokenDiff: ChainTokens = {};

  Object.keys(qtys).map((chain: string) => {
    const diaplayChain = getChainDisplayName(chain, true).toLowerCase().replace(" ", "-");
    if (!(diaplayChain in tokenDiff)) tokenDiff[diaplayChain] = {};
    let sortable: [string, BigNumber][] = [];

    for (const symbol in qtys[chain]) {
      sortable.push([symbol, qtys[chain][symbol].times(prices[chain][symbol])]);
    }
    sortable.sort(function (a: any[], b: any[]) {
      return b[1] - a[1];
    });

    for (let i = 0; i < Math.min(sortable.length, 50); i++) {
      const [symbol, value] = sortable[i];
      tokenDiff[diaplayChain][symbol] = value.decimalPlaces(2);
    }
  });

  return tokenDiff;
}
