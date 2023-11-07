import { getCurrentUnixTimestamp } from "../src/utils/date";
import { getPrices } from "../dimension-adapters/utils/prices";
import { fetchTokenOwnerLogs, fetchDeployedContracts } from "./layer2pg";
import { Chain } from "@defillama/sdk/build/general";
import BigNumber from "bignumber.js";
import deployers from "./bridgeDeployers";
import { multiCall } from "@defillama/sdk/build/abi/abi2";
import { Address } from "@defillama/sdk/build/types";

async function fetchSupplies(chain: Chain, contracts: Address[]): Promise<{ [token: string]: number }> {
  const res = await multiCall({
    chain,
    calls: contracts.map((target: string) => ({
      target,
    })),
    abi: "erc20:totalSupply",
    permitFailure: true,
  });
  const supplies: { [token: string]: number } = {};
  contracts.map((c: Address, i: number) => {
    if (res[i]) supplies[c] = res[i];
  });
  return supplies;
}
export async function fetchBridgeContracts(chain: Chain): Promise<Address[]> {
  const contracts: Address[] = (await fetchTokenOwnerLogs(chain, 1699285022)).map((t: any) => t.holder);
  const bridgeContracts: Address[] = [...new Set(contracts)];
  if (chain in deployers) bridgeContracts.push(...deployers[chain]);
  return bridgeContracts;
}
export async function fetchBridgedInTokens(
  chain: Chain,
  bridgeContracts: Address[],
  params: { endTimestamp: number; startTimestamp?: number }
): Promise<{ [token: string]: number }> {
  const endTimestamp: number = params.endTimestamp ?? getCurrentUnixTimestamp();
  const startTimestamp: number = params.startTimestamp ?? endTimestamp - 2 * 7 * 24 * 60 * 60; // 2w
  const contracts: Address[] = await fetchDeployedContracts({
    chain,
    startTimestamp,
    endTimestamp,
    deployerAddresses: bridgeContracts,
  });
  return await fetchSupplies(chain, contracts);
}
export async function fetchIncomingTokens(params: {
  chain: Chain;
  timestamp: number;
}): Promise<{ [token: string]: number }> {
  const chain = params.chain;
  const bridgeContracts: string[] = await fetchBridgeContracts(chain);
  return await fetchBridgedInTokens(chain, bridgeContracts, { endTimestamp: params.timestamp });
}
export default async function main(params: { chain: Chain; timestamp?: number }) {
  const chain = params.chain;
  const timestamp: number = params.timestamp ?? getCurrentUnixTimestamp();
  const tokenSupplies = await fetchIncomingTokens({ chain, timestamp });

  const prices = await getPrices(
    Object.keys(tokenSupplies).map((t: string) => `${chain}:${t}`),
    timestamp
  );

  const incoming: { [asset: string]: BigNumber } = {};
  Object.keys(tokenSupplies).map((t: string) => {
    const priceInfo = prices[`${chain}:${t}`];
    const quantity = tokenSupplies[t];
    if (!priceInfo || !quantity) return;
    const decimalShift: BigNumber = BigNumber(10).pow(BigNumber(priceInfo.decimals));
    const usdValue: BigNumber = BigNumber(priceInfo.price).times(BigNumber(quantity)).div(decimalShift);
    incoming[priceInfo.symbol] = BigNumber(usdValue).plus(incoming[priceInfo.symbol]);
  });

  return incoming;
}
main({ chain: "ethereum" }); // ts-node defi/l2/minted.ts
