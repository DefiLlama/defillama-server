import fetch from "node-fetch";
import { decimals, symbol } from "@defillama/sdk/build/erc20";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../adapters/solana/utils";
import { chainsThatShouldNotBeLowerCased } from "../utils/shared/constants";
import { cairoErc20Abis, call, feltArrToStr } from "../adapters/utils/starknet";

import * as sdk from "@defillama/sdk";

let solanaTokens: Promise<any>;
let _solanaTokens: Promise<any>;
export async function cacheSolanaTokens() {
  if (_solanaTokens === undefined) {
    _solanaTokens = fetch(
      "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json"
    ).catch((e) => {
      console.error("Failed to fetch Solana token list:", e);
      throw new Error(`Failed to fetch Solana token list: ${e.message}`);
    });
    solanaTokens = _solanaTokens.then((r) => r.json());
  }
  return solanaTokens;
}

export async function getSymbolAndDecimals(
  tokenAddress: string,
  chain: string,
  coingeckoSymbol: string,
  originalAddress?: string,
): Promise<{ symbol: string; decimals: number } | undefined> {
  if (chainsThatShouldNotBeLowerCased.includes(chain)) {
    let solTokens = { tokens: [] }
    if (chain == "solana") {
      solTokens = await solanaTokens;
    }
    const token = (solTokens.tokens as any[]).find(
      (t) => t.address === tokenAddress,
    );
    if (token === undefined && (chain === "solana" || chain === "eclipse")) {
      const solanaConnection = getConnection(chain);
      const decimalsQuery = await solanaConnection.getParsedAccountInfo(
        new PublicKey(tokenAddress),
      );
      const decimals = (decimalsQuery.value?.data as any)?.parsed?.info
        ?.decimals;
      if (typeof decimals !== "number") {
        // return;
        throw new Error(
          `Token ${chain}:${tokenAddress} not found in solana token list`,
        );
      }
      return {
        symbol: coingeckoSymbol.toUpperCase(),
        decimals: decimals,
      };
    }
    return {
      symbol: token.symbol,
      decimals: Number(token.decimals),
    };
  }

  let res
  switch (chain) {

    case 'sui':
      try {
        const res = await fetch(`${process.env.SUI_RPC}`, {
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "suix_getCoinMetadata",
            params: [tokenAddress],
          }),
        }).then((r) => r.json());
        const { symbol, decimals } = res.result;
        return { symbol, decimals };
      } catch (e) {
        return;
      }


    case 'starknet':
      try {
        let [symbol, decimals] = await Promise.all([
          call({
            abi: cairoErc20Abis.symbol,
            target: tokenAddress,
          }).then((r) => feltArrToStr([r])),
          call({
            abi: cairoErc20Abis.decimals,
            target: tokenAddress,
          }).then((r) => Number(r)),
        ]);
        if (!symbol?.length) symbol = '-'
        return { symbol, decimals };
      } catch (e) {
        return;
      }

    case 'hedera':
      try {
        const { symbol, decimals } = await fetch(
          `${process.env.HEDERA_RPC ?? "https://mainnet.mirrornode.hedera.com"
          }/api/v1/tokens/${tokenAddress}`,
        ).then((r) => r.json());
        return { symbol, decimals };
      } catch (e) {
        return;
      }


    case 'ton':
      try {
        console.log(`Fetching TON token data for ${originalAddress}`);
        const { details: { metadata: { symbol, decimals } } } = await fetch(
          `https://jetton-index.tonscan.org/public-dyor/jettons/${originalAddress}`,
        ).then((r) => r.json());
        return { symbol, decimals };
      } catch (e) {
        console.error(`Failed to fetch TON token data for ${originalAddress}`, e);
        return;
      }


    case 'aptos':
      if (!tokenAddress.includes("::")) {
        if (tokenAddress === '0x2a90fae71afc7460ee42b20ee49a9c9b29272905ad71fef92fbd8b3905a24b56') return;
        const { data } = await fetch(`https://api.aptoscan.com/v1/fungible_assets/${tokenAddress}?cluster=mainnet`).then((r) => r.json());
        if (data?.symbol) {
          return {
            decimals: data.decimals,
            symbol: data.symbol,
          };
        }
        return;
      }
      res = await fetch(
        `${process.env.APTOS_RPC ?? 'https://fullnode.mainnet.aptoslabs.com'}/v1/accounts/${tokenAddress.substring(
          0,
          tokenAddress.indexOf("::"),
        )}/resource/0x1::coin::CoinInfo%3C${tokenAddress}%3E`,
      ).then((r) => r.json());
      if (!res.data) return;
      return {
        decimals: res.data.decimals,
        symbol: res.data.symbol,
      };



    case 'stacks':
      res = await fetch(
        `https://api.hiro.so/metadata/v1/ft/${tokenAddress}`,
      ).then((r) => r.json());
      if (!res.decimals) return;
      return {
        decimals: res.decimals,
        symbol: res.symbol,
      };


    case 'tron':

      const tronApi = new sdk.ChainApi({ chain: "tron" });
      return {
        symbol: await tronApi.call({ target: originalAddress!, abi: "erc20:symbol" }),
        decimals: await tronApi.call({ target: originalAddress!, abi: "erc20:decimals" }),
      };

    case 'stellar':
      if (originalAddress?.includes('-')) {
        return {
          symbol: originalAddress.split('-')[0],
          decimals: 0, // Stellar tokens have 7 decimals by default}
        }
      } else { return; }

    case 'near':
      if (tokenAddress.endsWith('.factory.bridge.near')) {
        const ethApi = new sdk.ChainApi({ chain: "ethereum" });
        tokenAddress = '0x' + tokenAddress.replace('.factory.bridge.near', '');
        return {
          symbol: await ethApi.call({ target: tokenAddress, abi: "erc20:symbol" }),
          decimals: await ethApi.call({ target: tokenAddress, abi: "erc20:decimals" }),
        };
      } else { return; }
  }


  if (!tokenAddress.startsWith(`0x`)) {
    return;
    // throw new Error(
    //   `Token ${chain}:${tokenAddress} is not on solana or EVM so we cant get token data yet`,
    // );
  } else {
    try {
      return {
        symbol: (await symbol(tokenAddress, chain as any)).output,
        decimals: Number((await decimals(tokenAddress, chain as any)).output),
      };
    } catch (e) {
      return;
      // throw new Error(
      //   `ERC20 methods aren't working for token ${chain}:${tokenAddress}`,
      // );
    }
  }
}
