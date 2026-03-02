import BigNumber from "bignumber.js";
import { zero } from "../../l2/constants";
import { chainsThatShouldNotBeLowerCased } from "../utils/shared/constants";
import { getChainDisplayName } from "../utils/normalizeChain";
import * as sdk from "@defillama/sdk";
import { endpointMap, runInChunks } from "../../l2/utils";
import axios from "axios";

export type WalletEntry = { id: string; assets: string[] };

// Fetch balances for Solana
export async function fetchSolana(
  timestamp: number,
  wallets: WalletEntry[],
  tokenToProjectMap: { [token: string]: string },
  excludedAmounts: { [id: string]: { [chain: string]: BigNumber } }
) {
  const chain = "solana";
  const readableChain = getChainDisplayName(chain, true);
  if (timestamp != 0) throw new Error("Solana Active Mcap cannot be refilled");

  const tokensAndAccounts: any[] = [];
  wallets.forEach(({ id: account, assets }) => {
    assets.forEach((token: string) => {
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
// Fetch balances for Provenance (Cosmos SDK chain)
export async function fetchProvenance(
  timestamp: number,
  wallets: WalletEntry[],
  tokenToProjectMap: { [token: string]: string },
  excludedAmounts: { [id: string]: { [chain: string]: BigNumber } }
) {
  const chain = "provenance";
  const readableChain = getChainDisplayName(chain, true);
  if (timestamp != 0) throw new Error("Provenance Active Mcap cannot be refilled");

  const PROVENANCE_LCD = "https://api.provenance.io";

  for (const { id: address, assets } of wallets) {
    try {
      const res = await axios.get(
        `${PROVENANCE_LCD}/cosmos/bank/v1beta1/balances/${address}?pagination.limit=200`
      );
      const balances: Array<{ denom: string; amount: string }> = res.data?.balances ?? [];

      for (const denom of assets) {
        const entry = balances.find((b) => b.denom === denom);
        if (!entry?.amount) continue;

        const id = tokenToProjectMap[`${chain}:${denom}`];
        if (!id) continue;

        if (!(id in excludedAmounts)) excludedAmounts[id] = {};
        if (!(readableChain in excludedAmounts[id])) excludedAmounts[id][readableChain] = zero;
        excludedAmounts[id][readableChain] = excludedAmounts[id][readableChain].plus(entry.amount);
      }
    } catch (e) {
      console.error(`Failed to fetch Provenance balance for ${address}: ${e}`);
    }
  }
}

// Fetch balances for Stellar (Horizon API)
// Token asset keys use the format "{asset_code}-{asset_issuer}" (dash-separated).
export async function fetchStellar(
  timestamp: number,
  wallets: WalletEntry[],
  tokenToProjectMap: { [token: string]: string },
  excludedAmounts: { [id: string]: { [chain: string]: BigNumber } }
) {
  const chain = "stellar";
  const readableChain = getChainDisplayName(chain, true);
  if (timestamp != 0) throw new Error("Stellar Active Mcap cannot be refilled");

  for (const { id: accountId, assets } of wallets) {
    try {
      const res = await axios.get(`https://horizon.stellar.org/accounts/${accountId}`);
      const balances: Array<{
        balance: string;
        asset_type: string;
        asset_code?: string;
        asset_issuer?: string;
      }> = res.data?.balances ?? [];

      for (const assetKey of assets) {
        // assetKey format: "{asset_code}-{asset_issuer}"
        const dashIdx = assetKey.lastIndexOf("-");
        if (dashIdx === -1) continue;
        const asset_code = assetKey.substring(0, dashIdx);
        const asset_issuer = assetKey.substring(dashIdx + 1);

        const entry = balances.find(
          (b) => b.asset_code === asset_code && b.asset_issuer === asset_issuer
        );
        if (!entry?.balance) continue;

        const id = tokenToProjectMap[`${chain}:${assetKey}`];
        if (!id) continue;

        // Horizon balance is in display units; multiply by 1e7 to match supply decimals=7
        const rawAmount = Math.round(parseFloat(entry.balance) * 1e7);
        if (!(id in excludedAmounts)) excludedAmounts[id] = {};
        if (!(readableChain in excludedAmounts[id])) excludedAmounts[id][readableChain] = zero;
        excludedAmounts[id][readableChain] = excludedAmounts[id][readableChain].plus(rawAmount);
      }
    } catch (e) {
      console.error(`Failed to fetch Stellar balance for ${accountId}: ${e}`);
    }
  }
}

// Fetch balances for EVM chains
export async function fetchEvm(
  timestamp: number,
  chain: string,
  wallets: WalletEntry[],
  tokenToProjectMap: { [token: string]: string },
  excludedAmounts: { [id: string]: { [chain: string]: BigNumber } }
) {
  const api = new sdk.ChainApi({ chain, timestamp: timestamp == 0 ? undefined : timestamp });
  const calls: any[] = [];
  wallets.forEach(({ id: wallet, assets }) => {
    assets.forEach((target: string) => {
      calls.push({ target, params: wallet });
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
