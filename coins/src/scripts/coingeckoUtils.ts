import fetch from "node-fetch";
import { decimals, symbol } from "@defillama/sdk/build/erc20";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../adapters/solana/utils";
import { chainsThatShouldNotBeLowerCased } from "../utils/shared/constants";
import { cairoErc20Abis, call, feltArrToStr } from "../adapters/utils/starknet";

let solanaTokens: Promise<any>;
let _solanaTokens: Promise<any>;
export async function cacheSolanaTokens() {
  if (_solanaTokens === undefined) {
    _solanaTokens = fetch(
      "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json",
    );
    solanaTokens = _solanaTokens.then((r) => r.json());
  }
  return solanaTokens;
}

export async function getSymbolAndDecimals(
  tokenAddress: string,
  chain: string,
  coingeckoSymbol: string,
): Promise<{ symbol: string; decimals: number } | undefined> {
  if (chainsThatShouldNotBeLowerCased.includes(chain)) {
    const a = await solanaTokens;
    const token = ((await solanaTokens).tokens as any[]).find(
      (t) => t.address === tokenAddress,
    );
    if (token === undefined) {
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
  } else if (chain == "sui") {
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
  } else if (chain == "starknet") {
    try {
      const [symbol, decimals] = await Promise.all([
        call({
          abi: cairoErc20Abis.symbol,
          target: tokenAddress,
        }).then((r) => feltArrToStr([r])),
        call({
          abi: cairoErc20Abis.decimals,
          target: tokenAddress,
        }).then((r) => Number(r)),
      ]);
      return { symbol, decimals };
    } catch (e) {
      return;
    }
  } else if (chain == "hedera") {
    try {
      const { symbol, decimals } = await fetch(
        `${
          process.env.HEDERA_RPC ?? "https://mainnet.mirrornode.hedera.com"
        }/api/v1/tokens/${tokenAddress}`,
      ).then((r) => r.json());
      return { symbol, decimals };
    } catch (e) {
      return;
    }
    // } else if (chain == "hyperliquid") {
    //   await cacheHyperliquidTokens();
    //   const token = ((await hyperliquidTokens).tokens as any[]).find(
    //     (t) => t.tokenId === tokenAddress,
    //   );
    //   if (!token) return;
    //   return {
    //     decimals: token.weiDecimals,
    //     symbol: token.name,
    //   };
  } else if (chain == "aptos") {
    const res = await fetch(
      `${process.env.APTOS_RPC}/v1/accounts/${tokenAddress.substring(
        0,
        tokenAddress.indexOf("::"),
      )}/resource/0x1::coin::CoinInfo%3C${tokenAddress}%3E`,
    ).then((r) => r.json());
    if (!res.data) return;
    return {
      decimals: res.data.decimals,
      symbol: res.data.symbol,
    };
  } else if (chain == "stacks") {
    const res = await fetch(
      `https://api.hiro.so/metadata/v1/ft/${tokenAddress}`,
    ).then((r) => r.json());
    if (!res.decimals) return;
    return {
      decimals: res.decimals,
      symbol: res.symbol,
    };
  } else if (!tokenAddress.startsWith(`0x`)) {
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
