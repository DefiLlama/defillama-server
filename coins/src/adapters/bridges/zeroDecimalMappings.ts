import { Token } from "./index";
import tokenMappings from "../zeroDecimalTokenMapping.json";
import { formatExtraTokens } from "../utils";

export default async function bridge(): Promise<Token[]> {
  const response: any[] = [];

  Object.entries(tokenMappings).forEach(([chain, tokenMap]) => {
    const tokens: [string, string, string, number][] = [];
    Object.entries(tokenMap).map(
      ([from, { to, symbol, decimals: decimalsNum }]) => {
        const decimals = +decimalsNum;
        if (isNaN(decimals))
          throw new Error("Is not valid token mapping: " + from);
        tokens.push([from, to, symbol, decimals]);
      },
    );
    response.push(formatExtraTokens(chain, tokens));
  });

  return response.flat();
}

bridge(); // ts-node coins/src/adapters/bridges/zeroDecimalMappings.ts
