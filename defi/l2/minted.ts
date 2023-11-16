import { getCurrentUnixTimestamp } from "../src/utils/date";
import { fetchAllTokens, updateAllTokenSupplies } from "./layer2pg";
import { McapData, SupplyInsert, TokenTvlData } from "./types";
import { Chain } from "@defillama/sdk/build/general";
import BigNumber from "bignumber.js";
import { multiCall } from "@defillama/sdk/build/abi/abi2";
import { Address } from "@defillama/sdk/build/types";
import { fetchBridgeTokenList } from "./incoming";
import { DollarValues, Supplies } from "./types";
import { zero } from "./constants";
import { getMcaps, getPrices } from "./utils";

async function fetchMissingSupplies(chain: Chain, storedSupplies: Supplies): Promise<Supplies> {
  const calls: { target: string }[] = [];
  const allSupplies: Supplies = {};

  Object.keys(storedSupplies).map((target: Address) => {
    if (storedSupplies[target]) allSupplies[target] = storedSupplies[target];
    else calls.push({ target });
  });

  if (!calls.length) return storedSupplies;
  const supplies = await multiCall({
    chain,
    calls,
    abi: "erc20:totalSupply",
    permitFailure: true,
  });

  const writes: SupplyInsert[] = [];
  calls.map(({ target }, i: number) => {
    const supply = supplies[i];
    if (!supply) return;
    allSupplies[target] = supply;
    writes.push({ token: target, supply, chain });
  });

  await updateAllTokenSupplies(writes);

  return allSupplies;
}
export async function fetchMinted(params: {
  chains: Chain[];
  timestamp?: number;
  searchWidth?: number;
}): Promise<{ tvlData: TokenTvlData; mcapData: McapData }> {
  const timestamp: number = params.timestamp ?? getCurrentUnixTimestamp();
  const tvlData: TokenTvlData = {};
  const mcapData: McapData = {};

  await Promise.all(
    params.chains.map(async (chain: Chain) => {
      const incomingTokens: Address[] = await fetchBridgeTokenList(chain);
      const storedSupplies = await fetchAllTokens(chain);

      // filter any tokens that arent natively minted
      incomingTokens.map((t: Address) => {
        if (t in storedSupplies) delete storedSupplies[t];
      });
      const supplies = await fetchMissingSupplies(chain, storedSupplies);

      const [prices, mcaps] = await Promise.all([
        getPrices(
          Object.keys(supplies).map((t: string) => `${chain}:${t}`),
          timestamp
        ),
        getMcaps(
          Object.keys(supplies).map((t: string) => `${chain}:${t}`),
          timestamp
        ),
      ]);

      const dollarValues: DollarValues = {};
      Object.keys(supplies).map((t: string) => {
        const priceInfo = prices[`${chain}:${t}`];
        const mcapInfo = mcaps[`${chain}:${t}`];
        const supply = supplies[t];
        if (!priceInfo || !supply || !mcapInfo) return;
        if (!(priceInfo.symbol in dollarValues)) dollarValues[priceInfo.symbol] = zero;
        const decimalShift: BigNumber = BigNumber(10).pow(BigNumber(priceInfo.decimals));
        const usdValue: BigNumber = BigNumber(priceInfo.price).times(BigNumber(supply)).div(decimalShift);
        if (!(priceInfo.symbol in mcapData))
          mcapData[priceInfo.symbol] = { chain, native: usdValue, total: BigNumber(mcapInfo.mcap) };
        dollarValues[priceInfo.symbol] = BigNumber(usdValue).plus(dollarValues[priceInfo.symbol]);
      });

      return (tvlData[chain] = dollarValues);
    })
  );
  return { tvlData, mcapData };
}
