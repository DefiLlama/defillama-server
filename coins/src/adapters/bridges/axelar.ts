import { fetch } from "../utils";
import { Token } from "./index";
import { handler as getChains } from "../../getChains";

const chainMap: { [chain: string]: string } = {
  binance: "bsc",
  avalanche: "avax",
};

export default async function bridge(): Promise<Token[]> {
  const tokenMap = await fetch("https://api.axelarscan.io/?method=getAssets");
  const tokens: Token[] = [];

  //   const unknownChains: string[] = [];
  const chainSlugs = JSON.parse((await getChains()).body);
  tokenMap.map((token: any) => {
    if (!token.addresses) return;
    Object.keys(token.addresses).map((chain: string) => {
      let normalizedChain: string;
      if (chain in chainMap) {
        normalizedChain = chainMap[chain];
      } else if (chainSlugs.includes(chain)) {
        normalizedChain = chain;
      } else {
        // unknownChains.push(chain);
        return;
      }

      if (token.addresses[chain].ibc_denom) {
        tokens.push({
          from: `${normalizedChain}:${token.addresses[chain].ibc_denom}`,
          to: `coingecko#${token.coingecko_id}`,
          symbol: token.symbol,
          decimals: token.decimals,
        });
      } else if (token.addresses[chain].address) {
        tokens.push({
          from: `${normalizedChain}:${token.addresses[chain].address}`,
          to: `coingecko#${token.coingecko_id}`,
          symbol: token.addresses[chain].symbol ?? token.symbol,
          decimals: token.decimals,
        });
      }
    });
  });

  //   console.log([...new Set(unknownChains)]);
  return tokens;
}
