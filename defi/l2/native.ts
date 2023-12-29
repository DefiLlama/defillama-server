import { getCurrentUnixTimestamp } from "../src/utils/date";
import { fetchAllTokens } from "./layer2pg";
import { McapData, TokenTvlData, DollarValues } from "./types";
import { Chain } from "@defillama/sdk/build/general";
import BigNumber from "bignumber.js";
import { Address } from "@defillama/sdk/build/types";
import { zero } from "./constants";
import { getMcaps, getPrices, fetchBridgeTokenList, fetchSupplies } from "./utils";
import fetchThirdPartyTokenList from "./adapters/thirdParty";

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
      const canonicalTokens: Address[] = await fetchBridgeTokenList(chain);
      const thirdPartyTokens: Address[] = (await fetchThirdPartyTokenList())[chain] ?? [];
      const incomingTokens = [...canonicalTokens, ...thirdPartyTokens];

      let storedTokens = await fetchAllTokens(chain);

      // filter any tokens that arent natively minted
      incomingTokens.map((t: Address) => {
        const i = storedTokens.indexOf(t);
        if (i == -1) return;
        storedTokens.splice(i, 1);
      });

      const keys = storedTokens.map((t: string) => `${chain}:${t}`);

      // do these in order to lighten rpc, rest load
      const supplies = await fetchSupplies(chain, keys);
      const prices = await getPrices(Object.keys(supplies), timestamp);
      const mcaps = await getMcaps(Object.keys(prices), timestamp);

      function findDollarValues() {
        Object.keys(supplies).map((t: string) => {
          const priceInfo = prices[`${chain}:${t}`];
          const mcapInfo = mcaps[`${chain}:${t}`];
          const supply = supplies[t];
          if (!priceInfo || !supply || !mcapInfo) return;
          if (!(priceInfo.symbol in dollarValues)) dollarValues[priceInfo.symbol] = zero;
          const decimalShift: BigNumber = BigNumber(10).pow(BigNumber(priceInfo.decimals));
          const usdValue: BigNumber = BigNumber(priceInfo.price).times(BigNumber(supply)).div(decimalShift);
          mcapData[chain][priceInfo.symbol] = { native: usdValue, total: BigNumber(mcapInfo.mcap) };
          if (priceInfo.symbol in mcapData.total)
            mcapData.total[priceInfo.symbol].native = mcapData.total[priceInfo.symbol].native.plus(usdValue);
          else mcapData.total[priceInfo.symbol] = { native: usdValue, total: BigNumber(mcapInfo.mcap) };
          dollarValues[priceInfo.symbol] = BigNumber(usdValue).plus(dollarValues[priceInfo.symbol]);
        });
      }

      const dollarValues: DollarValues = {};
      mcapData[chain] = {};
      findDollarValues();

      return (tvlData[chain] = dollarValues);
    })
  );
  return { tvlData, mcapData };
}
