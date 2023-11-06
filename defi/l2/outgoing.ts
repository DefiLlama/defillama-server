import { getCurrentUnixTimestamp } from "../src/utils/date";
import { getPrices } from "../dimension-adapters/utils/prices";
import { fetchTokenOwnerLogs } from "./layer2pg";
import { Chain } from "@defillama/sdk/build/general";
import { Address } from "@defillama/sdk/build/types";
import BigNumber from "bignumber.js";

const zero = BigNumber(0);
type TokenData = {
  amount: number;
  token: Address;
  holder: Address;
};

export default async function main(params: { chain: Chain; timestamp?: number; searchWidth?: number }) {
  const timestamp: number = params.timestamp ?? getCurrentUnixTimestamp();
  const bridgedTokens: TokenData[] = await fetchTokenOwnerLogs(params.chain, params.searchWidth);
  const prices = await getPrices(
    bridgedTokens.map((t: TokenData) => `${params.chain}:${t.token}`),
    timestamp
  );

  const bridgedOutAssets: { [asset: string]: BigNumber } = {};
  bridgedTokens.map((t: TokenData) => {
    const priceInfo = prices[`${params.chain}:${t.token}`];
    if (!priceInfo) return;
    if (!(priceInfo.symbol in bridgedOutAssets)) bridgedOutAssets[priceInfo.symbol] = zero;
    const decimalShift: BigNumber = BigNumber(10).pow(BigNumber(priceInfo.decimals));
    const usdValue: BigNumber = BigNumber(priceInfo.price).times(BigNumber(t.amount)).div(decimalShift);
    bridgedOutAssets[priceInfo.symbol] = BigNumber(usdValue).plus(bridgedOutAssets[priceInfo.symbol]);
  });

  return;
}
main({ chain: "ethereum" }); // ts-node defi/l2/bridged.ts
