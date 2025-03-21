import type { Token } from "./index";
import { fetch } from "../utils";

type TokneInfo = {
  chainId: number;
  address: string;
  contractName: string;
  evmAddress: string;
  flowAddress: string;
  symbol: string;
  name: string;
  description: string;
  decimals: number;
  logoURI: string;
  tags: string[];
  extensions: Record<string, string>;
};

export default async function bridge(): Promise<Token[]> {
  const reviewedTokenlist = (
    await fetch(
      "https://raw.githubusercontent.com/fixes-world/token-list-jsons/refs/heads/main/jsons/mainnet/flow/reviewers/0xa2de93114bae3e73-featured.json"
    )
  ).tokens as TokneInfo[];

  return reviewedTokenlist
    .map((token): Token | null => {
      if (
        token.tags.includes("bridged-coin") &&
        typeof token.extensions?.coingeckoId === "string"
      )
        return {
          from: `flow:${token.evmAddress}`,
          to: `coingecko#${token.extensions?.coingeckoId}`,
          symbol: token.symbol,
          decimals: token.decimals,
        };
      return null;
    })
    .filter((t) => t !== null) as Token[];
}
