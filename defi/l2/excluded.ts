import { getPrices } from "./utils";
import { excludedTvlId } from "./constants";
import { multiCall } from "@defillama/sdk/build/abi/abi2";
import { getBlock } from "@defillama/sdk/build/util/blocks";

const excludedTokensAndOwners: { [chain: string]: [string, string][] } = {
  base: [
    ["0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", "0x06A19654e0872Ba71c2261EA691Ecf8a0c677156"], // DEGEN
    ["0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", "0x7d00D30269fC62Ab5fAb54418feeDBdc71FDb25f"], // DEGEN
    ["0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", "0x6be3ffea7996f0f50b3e5f79372b44d1fd78db30"], // DEGEN
    ["0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", "0x06A19654e0872Ba71c2261EA691Ecf8a0c677156"], // DEGEN
  ],
  hyperliquid: [
    ["0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463", "0x20000000000000000000000000000000000000c5"], // UBTC
    ["0xbe6727b535545c67d5caa73dea54865b92cf7907", "0x20000000000000000000000000000000000000dD"], // UETH
    ["0x068f321fa8fb9f0d135f290ef6a3e2813e1c8a29", "0x20000000000000000000000000000000000000fE"], // USOL
  ],
  metis: [
    ["0x2692BE44A6E38B698731fDDf417d060f0d20A0cB", "0x92370f368242CF442EA10dC299BA8CdB1e6aEE03"], // BNB
  ],
};

export async function getExcludedTvl(timestamp: number) {
  const TvlRecord: any = {
    SK: timestamp,
    tvl: {},
    PK: `hourlyUsdTokensTvl#${excludedTvlId}`,
  };

  await Promise.all(
    Object.keys(excludedTokensAndOwners).map(async (chain: string) => {
      const uniqueTokens = [...new Set(excludedTokensAndOwners[chain].map(([token]) => token))];

      const block = await getBlock(chain, timestamp);

      const [balances, symbols, decimals, prices] = await Promise.all([
        multiCall({
          abi: "erc20:balanceOf",
          calls: excludedTokensAndOwners[chain].map(([token, owner]) => ({ target: token, params: [owner] })),
          chain,
          block: block.number,
        }),
        multiCall({
          abi: "erc20:symbol",
          calls: uniqueTokens.map((target) => ({ target })),
          chain,
          block: block.number,
          withMetadata: true,
        }),
        multiCall({
          abi: "erc20:decimals",
          calls: uniqueTokens.map((target) => ({ target })),
          chain,
          block: block.number,
          withMetadata: true,
        }),
        getPrices(
          uniqueTokens.map((token) => `${chain}:${token}`),
          timestamp
        ),
      ]);

      if (!TvlRecord[chain]) TvlRecord[chain] = {};

      excludedTokensAndOwners[chain].map(([token], i) => {
        const symbol = symbols.find((s: any) => s.input.target == token)?.output;
        const decimal = decimals.find((s: any) => s.input.target == token)?.output;
        const price = prices[`${chain}:${token}`];
        if (!symbol || !decimal || !price) return;

        const usdValue = (balances[i] / 10 ** decimal) * price.price;

        if (!TvlRecord[chain][symbol]) TvlRecord[chain][symbol] = 0;
        TvlRecord[chain][symbol] += usdValue;
      });
    })
  );

  return TvlRecord;
}
