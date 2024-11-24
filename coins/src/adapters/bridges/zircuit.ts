import { Token } from "./index";
import { fetch } from "../utils";
import { chainIdMap } from "./celer";

export default async function bridge(): Promise<Token[]> {
  const res = (await fetch("https://bridge.zircuit.com/api/tokens")) as any[];

  const tokens: Token[] = [];
  res.map(
    ({
      chainId,
      addressLocal,
      addressRemote,
      symbol,
      decimalsLocal: decimals,
    }) => {
      if (!(chainId in chainIdMap)) return;
      const to = `${chainIdMap[chainId]}:${addressRemote}`;
      tokens.push({
        from: `zircuit:${addressLocal}`,
        to,
        decimals,
        symbol,
      });
    },
  );

  return tokens;
}
