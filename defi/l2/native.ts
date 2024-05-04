import { getCurrentUnixTimestamp } from "../src/utils/date";
import { fetchAllTokens } from "./layer2pg";
import { McapData, TokenTvlData, DollarValues } from "./types";
import { Chain } from "@defillama/sdk/build/general";
import BigNumber from "bignumber.js";
import { Address } from "@defillama/sdk/build/types";
import { geckoSymbols, ownTokens, zero } from "./constants";
import { getMcaps, getPrices, fetchBridgeTokenList, fetchSupplies } from "./utils";
import fetchThirdPartyTokenList from "./adapters/thirdParty";
import { fetchAdaTokens } from "./adapters/ada";

export async function fetchMinted(params: {
  chains: Chain[];
  timestamp?: number;
  searchWidth?: number;
}): Promise<{ tvlData: TokenTvlData; mcapData: McapData }> {
  const timestamp: number = params.timestamp ?? getCurrentUnixTimestamp();
  const tvlData: TokenTvlData = {};
  const mcapData: McapData = { total: {} };

  await Promise.all(
    params.chains.map(async (chain: Chain) => {
      try {
        const canonicalTokens: Address[] = await fetchBridgeTokenList(chain);
        const thirdPartyTokens: Address[] = (await fetchThirdPartyTokenList())[chain] ?? [];
        const incomingTokens = [...new Set([...canonicalTokens, ...thirdPartyTokens])];

        let storedTokens = await fetchAllTokens(chain);

        // filter any tokens that arent natively minted
        incomingTokens.map((t: Address) => {
          const i = storedTokens.indexOf(t);
          if (i == -1) return;
          storedTokens.splice(i, 1);
        });

        if (chain == "cardano") storedTokens = await fetchAdaTokens();

        const ownTokenCgid: string | undefined = ownTokens[chain]?.address.startsWith("coingecko:")
          ? ownTokens[chain].address
          : undefined;
        if (ownTokenCgid) storedTokens.push(ownTokenCgid);

        // do these in order to lighten rpc, rest load
        const prices = await getPrices(
          storedTokens.map((t: string) => (t.startsWith("coingecko:") ? t : `${chain}:${t}`)),
          timestamp
        );
        Object.keys(prices).map((p: string) => {
          if (p.startsWith("coingecko:")) prices[p].decimals = 0;
        });
        const mcaps = await getMcaps(Object.keys(prices), timestamp);

        const supplies = await fetchSupplies(
          chain,
          Object.keys(prices).map((t: string) => t.substring(t.indexOf(":") + 1)),
          params.timestamp
        );

        if (ownTokenCgid && ownTokenCgid in mcaps)
          supplies[ownTokenCgid] = mcaps[ownTokenCgid].mcap / prices[ownTokenCgid].price;

        function findDollarValues() {
          Object.keys(mcaps).map((t: string) => {
            const priceInfo = prices[t];
            const mcapInfo = mcaps[t];
            const supply = supplies[t];
            if (!priceInfo || !supply || !mcapInfo) return;
            const symbol = geckoSymbols[priceInfo.symbol.replace("coingecko:", "")] ?? priceInfo.symbol.toUpperCase();
            if (!(symbol in dollarValues)) dollarValues[symbol] = zero;
            const decimalShift: BigNumber = BigNumber(10).pow(BigNumber(priceInfo.decimals));
            const usdValue: BigNumber = BigNumber(priceInfo.price).times(BigNumber(supply)).div(decimalShift);
            if (t != "coingecko:bitcoin" && usdValue.isGreaterThan(BigNumber(1e12))) {
              console.log(`token ${t} on ${chain} has over a trillion usdValue LOL`);
              return;
            }
            mcapData[chain][symbol] = { native: usdValue, total: BigNumber(mcapInfo.mcap) };
            if (symbol in mcapData.total) mcapData.total[symbol].native = mcapData.total[symbol].native.plus(usdValue);
            else mcapData.total[symbol] = { native: usdValue, total: BigNumber(mcapInfo.mcap) };
            dollarValues[symbol] = BigNumber(usdValue).plus(dollarValues[symbol]);
          });
        }

        const dollarValues: DollarValues = {};
        mcapData[chain] = {};
        findDollarValues();

        tvlData[chain] = dollarValues;
      } catch (e) {
        console.error(`fetchMinted() failed for ${chain} with ${e}`);
      }
    })
  );
  return { tvlData, mcapData };
}
