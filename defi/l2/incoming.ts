import { getCurrentUnixTimestamp } from "../src/utils/date";
import { Chain } from "@defillama/sdk/build/general";
import BigNumber from "bignumber.js";
import { DollarValues, TokenTvlData } from "./types";
import { geckoSymbols, zero } from "./constants";
import { fetchBridgeTokenList, fetchSupplies, getPrices } from "./utils";

export async function fetchIncoming(params: { canonical: TokenTvlData; timestamp?: number }): Promise<TokenTvlData> {
  const canonicalTvls: TokenTvlData = params.canonical;
  const timestamp: number = params.timestamp ?? getCurrentUnixTimestamp();
  const data: TokenTvlData = {};
  await Promise.all(
    Object.keys(canonicalTvls).map(async (chain: Chain) => {
      try {
        const tokens: string[] = await fetchBridgeTokenList(chain);

        if (!tokens.length) {
          data[chain] = {};
          return;
        }

        const prices = await getPrices(
          tokens.map((t: string) => `${chain}:${t}`),
          timestamp
        );

        const supplies = await fetchSupplies(
          chain,
          Object.keys(prices).map((t: string) => t.substring(t.indexOf(":") + 1)),
          params.timestamp
        );

        data[chain] = findDollarValues();

        function findDollarValues() {
          const dollarValues: DollarValues = {};
          Object.keys(supplies).map((t: string) => {
            const priceInfo = prices[t];
            const supply = supplies[t];
            if (!priceInfo || !supply) return;
            const symbol = geckoSymbols[priceInfo.symbol.replace("coingecko:", "")] ?? priceInfo.symbol.toUpperCase();
            if (symbol in canonicalTvls[chain]) return;
            if (!(symbol in dollarValues)) dollarValues[symbol] = zero;
            const decimalShift: BigNumber = BigNumber(10).pow(BigNumber(priceInfo.decimals));
            const usdValue: BigNumber = BigNumber(priceInfo.price).times(BigNumber(supply)).div(decimalShift);
            dollarValues[symbol] = BigNumber(usdValue).plus(dollarValues[symbol]);
          });

          return dollarValues;
        }
      } catch (e) {
        console.error(`fetchIncoming() failed for ${chain} with ${e}`);
      }
    })
  );
  return data;
}
