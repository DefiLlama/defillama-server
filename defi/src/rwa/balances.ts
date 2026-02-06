import BigNumber from "bignumber.js";
import { zero } from "../../l2/constants";
import { chainsThatShouldNotBeLowerCased } from "../utils/shared/constants";
import { getChainDisplayName } from "../utils/normalizeChain";
import * as sdk from "@defillama/sdk";
import { endpointMap, runInChunks } from "../../l2/utils";
import axios from "axios";

// Fetch balances for Solana
export async function fetchSolana(
  timestamp: number,
  wallets: { [wallet: string]: { id: string; assets: string[] } },
  tokenToProjectMap: { [token: string]: string },
  excludedAmounts: { [id: string]: { [chain: string]: BigNumber } }
) {
  const chain = "solana";
  const readableChain = getChainDisplayName(chain, true);
  if (timestamp != 0) throw new Error("Solana Active Mcap cannot be refilled");

  const tokensAndAccounts: any[] = [];
  Object.keys(wallets).forEach((account: string) => {
    wallets[account].assets.forEach((token: string) => {
      tokensAndAccounts.push([token, account]);
    });
  });

  const endpoint = endpointMap.solana();

  await runInChunks(tokensAndAccounts, async (chunk: any[]) => {
    const body = chunk.map(([token, account], i) => formTokenBalanceQuery(token, account, i));
    const tokenBalances: any = await axios.post(endpoint, body);
    tokenBalances.data.forEach((res: any) => {
      if (!res || !res.result || !res.result.value) return;
      res.result.value.forEach(
        ({
          account: {
            data: {
              parsed: {
                info: {
                  mint,
                  tokenAmount: { amount },
                },
              },
            },
          },
        }: any) => {
          const id = tokenToProjectMap[`${chain}:${mint}`];
          if (!(id in excludedAmounts)) excludedAmounts[id] = {};
          if (!(readableChain in excludedAmounts[id])) excludedAmounts[id][readableChain] = zero;
          excludedAmounts[id][readableChain] = excludedAmounts[id][readableChain].plus(amount);
        }
      );
    });

    function formTokenBalanceQuery(token: any, account: any, id = 1) {
      return {
        jsonrpc: "2.0",
        id,
        method: "getTokenAccountsByOwner",
        params: [account, { mint: token }, { encoding: "jsonParsed" }],
      };
    }
  });
}
// Fetch balances for EVM chains
export async function fetchEvm(
  timestamp: number,
  chain: string,
  wallets: { [wallet: string]: { id: string; assets: string[] } },
  tokenToProjectMap: { [token: string]: string },
  excludedAmounts: { [id: string]: { [chain: string]: BigNumber } }
) {
  const api = new sdk.ChainApi({ chain, timestamp: timestamp == 0 ? undefined : timestamp });
  const calls: any[] = [];
  Object.keys(wallets).forEach((params: string) => {
    wallets[params].assets.forEach((target: string) => {
      calls.push({ target, params });
    });
  });

  const balances = await api.multiCall({
    abi: "erc20:balanceOf",
    calls,
    permitFailure: true,
    withMetadata: true,
  });

  balances.forEach((b: any) => {
    if (!b) return;
    const { input, output, success } = b;
    if (!success || output == "0") return;
    const normalizedAddress = chainsThatShouldNotBeLowerCased.includes(chain)
      ? input.target
      : input.target.toLowerCase();
    const id = tokenToProjectMap[`${chain}:${normalizedAddress}`];

    const readableChain = getChainDisplayName(chain, true);
    if (!(id in excludedAmounts)) excludedAmounts[id] = {};
    if (!(readableChain in excludedAmounts[id])) excludedAmounts[id][readableChain] = zero;
    excludedAmounts[id][readableChain] = excludedAmounts[id][readableChain].plus(output);
  });
}
