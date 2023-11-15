import { getCurrentUnixTimestamp } from "../src/utils/date";
import { fetchTokenOwnerLogs, fetchDeployedContracts, fetchTokenSupplies } from "./layer2pg";
import { Chain } from "@defillama/sdk/build/general";
import BigNumber from "bignumber.js";
import deployers from "./bridgeDeployers";
import { multiCall } from "@defillama/sdk/build/abi/abi2";
import { Address } from "@defillama/sdk/build/types";
import * as incomingAssets from "./adapters";
import { DollarValues, TokenTvlData } from "./types";
import { zero } from "./constants";
import { getPrices } from "./utils";

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
export async function fetchBridgeContracts2(chain: Chain): Promise<Address[]> {
  const contracts: Address[] = (await fetchTokenOwnerLogs(chain, 1699285022)).map((t: any) => t.holder);
  const bridgeContracts: Address[] = [...new Set(contracts)];
  if (chain in deployers) bridgeContracts.push(...deployers[chain]);
  return bridgeContracts;
}
export async function fetchBridgedInTokens2(
  chain: Chain,
  bridgeContracts: Address[],
  params: { endTimestamp: number; startTimestamp?: number }
): Promise<{ [token: string]: number }> {
  const endTimestamp: number = params.endTimestamp ?? getCurrentUnixTimestamp();
  const startTimestamp: number = params.startTimestamp ?? endTimestamp - 7 * 24 * 60 * 60 * 52; // 52w
  const contracts: Address[] = await fetchDeployedContracts({
    chain,
    startTimestamp,
    endTimestamp,
    deployerAddresses: bridgeContracts,
  });
  return await fetchSupplies(chain, contracts);
}
export async function fetchIncomingTokens2(params: {
  chain: Chain;
  timestamp: number;
}): Promise<{ [token: string]: number }> {
  const chain = params.chain;
  const bridgeContracts: string[] = await fetchBridgeContracts2(chain);
  return await fetchBridgedInTokens2(chain, bridgeContracts, { endTimestamp: params.timestamp });
}
export async function indexed(params: { chain: Chain; timestamp?: number }) {
  const chain = params.chain;
  const timestamp: number = params.timestamp ?? getCurrentUnixTimestamp();
  const tokenSupplies = await fetchIncomingTokens2({ chain, timestamp });

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

export async function fetchBridgeTokenList(chain: Chain): Promise<Address[]> {
  const j = Object.keys(incomingAssets).indexOf(chain);
  if (j == -1) return [];
  const tokens: Address[] = await Object.values(incomingAssets)[j]();
  return tokens;
}
export async function fetchIncoming(params: { chains: Chain[]; timestamp?: number }): Promise<TokenTvlData> {
  const timestamp: number = params.timestamp ?? getCurrentUnixTimestamp();
  const data: TokenTvlData = {};
  params.chains.map(async (chain: Chain) => {
    const tokens: string[] = await fetchBridgeTokenList(chain);
    if (!tokens.length) return {};
    const supplies = await fetchTokenSupplies(chain, tokens);

    const prices = await getPrices(
      Object.keys(supplies).map((t: string) => `${chain}:${t}`),
      timestamp
    );

    const dollarValues: DollarValues = {};
    Object.keys(supplies).map((t: string) => {
      const priceInfo = prices[`${chain}:${t}`];
      const supply = supplies[t];
      if (!priceInfo || !supply) return;
      if (!(priceInfo.symbol in dollarValues)) dollarValues[priceInfo.symbol] = zero;
      const decimalShift: BigNumber = BigNumber(10).pow(BigNumber(priceInfo.decimals));
      const usdValue: BigNumber = BigNumber(priceInfo.price).times(BigNumber(supply)).div(decimalShift);
      dollarValues[priceInfo.symbol] = BigNumber(usdValue).plus(dollarValues[priceInfo.symbol]);
    });

    data[chain] = dollarValues;
  });
  return data;
}
