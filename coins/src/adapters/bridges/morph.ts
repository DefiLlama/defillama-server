import { Token } from "./index";
import { fetch } from "../utils";
import { chainIdMap } from "./celer";

type PartialToken = {
  from?: string;
  to?: string;
  decimals?: string;
  symbol?: string;
};

export default async function bridge(): Promise<Token[]> {
  const res = (
    await fetch(
      "https://raw.githubusercontent.com/morph-l2/morph-list/main/src/mainnet/tokenList.json",
    )
  ).tokens as any[];

  const p: { [name: string]: PartialToken } = {};
  res.map(({ chainId, name, address, symbol, decimals }) => {
    if (chainId == "2818") {
      p[name] = {
        from: `morph:${address}`,
        symbol,
        decimals,
        ...p[name],
      };
    } else {
      const chain = chainIdMap[chainId];
      if (!chain) return;
      p[name] = {
        to: `${chain}:${address}`,
      };
    }
  });

  const completeTokens = Object.values(p).filter(
    (t: any) => "from" in t && "to" in t,
  ) as Token[];

  return completeTokens;
}
