import { fetch } from "../utils";
import { Token } from "./index";
import { getTokenAndRedirectDataMap } from "../utils/database";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { chainIdMap } from "./celer";
import { CoinData } from "../utils/dbInterfaces";

type RedirectedTokens = {
  fromChain: string;
  fromAddress: string;
  to: string;
  symbol: string;
  decimals: number;
};

type ListData = {
  id: number;
  address: string;
  chainId: number;
  symbol: string;
  decimals: number;
  originalId: number;
};

export default async function bridge(): Promise<Token[]> {
  const tokenList: { tokens: ListData[] } = await fetch(
    "https://raw.githubusercontent.com/symbiosis-finance/js-sdk/refs/heads/main/src/crosschain/config/cache/mainnet.json",
  );

  const redirectedTokens: RedirectedTokens[] = [];
  const idMap: { [id: number]: ListData } = {};
  tokenList.tokens.map((token: ListData) => {
    if (token.id) idMap[token.id] = token;
  });

  tokenList.tokens.map(
    ({ address, chainId, symbol, decimals, originalId }: ListData) => {
      if (!originalId || !address || !symbol || !decimals) return;
      const source = idMap[originalId];
      const chain = chainIdMap[chainId];
      if (!chain || !chainIdMap[source.chainId]) return;

      redirectedTokens.push({
        fromChain: chainIdMap[source.chainId],
        fromAddress: source.address.toLowerCase(),
        to: `${chain}:${address.toLowerCase()}`,
        symbol,
        decimals,
      });
    },
  );

  const toQueries: { [chain: string]: string[] } = {};
  redirectedTokens.map(({ fromChain, fromAddress }: RedirectedTokens) => {
    if (!(fromChain in toQueries)) toQueries[fromChain] = [];
    toQueries[fromChain].push(fromAddress);
  });

  const fromData: { [chain: string]: { [address: string]: CoinData } } = {};
  await Promise.all(
    Object.keys(toQueries).map((chain: string) =>
      getTokenAndRedirectDataMap(
        toQueries[chain],
        chain,
        getCurrentUnixTimestamp(),
      ).then((d) => {
        fromData[chain] = d;
      }),
    ),
  );

  const tokens: Token[] = [];
  redirectedTokens.map(
    ({ decimals, fromAddress, fromChain, symbol, to }: RedirectedTokens) => {
      const from = fromData[fromChain][fromAddress];
      if (!from) return;
      tokens.push({
        to,
        symbol,
        decimals,
        from: from.redirect ?? `${fromChain}:${fromAddress}`,
      });
    },
  );

  return tokens;
}
