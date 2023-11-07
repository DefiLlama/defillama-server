import { getCurrentUnixTimestamp } from "../src/utils/date";
import { getPrices } from "../dimension-adapters/utils/prices";
import { SupplyInsert, fetchAllTokens, updateAllTokenSupplies } from "./layer2pg";
import { Chain } from "@defillama/sdk/build/general";
import BigNumber from "bignumber.js";
import { multiCall } from "@defillama/sdk/build/abi/abi2";
import { Address } from "@defillama/sdk/build/types";
import { fetchIncomingTokens } from "./incoming";

const zero = BigNumber(0);
type Supplies = { [token: string]: number };

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
export default async function main(params: { chain: Chain; timestamp?: number; searchWidth?: number }) {
  const chain = params.chain;
  const timestamp: number = params.timestamp ?? getCurrentUnixTimestamp();
  const incomingTokens: Address[] = Object.keys(await fetchIncomingTokens({ chain, timestamp }));
  let storedSupplies = await fetchAllTokens(chain);

  // filter any tokens that arent natively minted
  incomingTokens.map((t: Address) => {
    if (t in storedSupplies) delete storedSupplies[t];
  });
  await fetchMissingSupplies(chain, storedSupplies);

  const prices = await getPrices(
    Object.keys(storedSupplies).map((t: string) => `${chain}:${t}`),
    timestamp
  );

  const mintedAssets: { [asset: string]: BigNumber } = {};
  Object.keys(storedSupplies).map((t: string) => {
    const priceInfo = prices[`${chain}:${t}`];
    const supplyData = storedSupplies[t];
    if (!priceInfo || !supplyData) return;
    if (!(priceInfo.symbol in mintedAssets)) mintedAssets[priceInfo.symbol] = zero;
    const decimalShift: BigNumber = BigNumber(10).pow(BigNumber(priceInfo.decimals));
    const usdValue: BigNumber = BigNumber(priceInfo.price).times(BigNumber(supplyData.total)).div(decimalShift);
    mintedAssets[priceInfo.symbol] = BigNumber(usdValue).plus(mintedAssets[priceInfo.symbol]);
  });

  return;
}
main({ chain: "ethereum" }); // ts-node defi/l2/minted.ts
