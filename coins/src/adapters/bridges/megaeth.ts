import { lowercaseAddress } from "../../utils/processCoin";
import { fetch } from "../utils";
import { chainIdMap } from "./celer";
import { Token } from "./index";

export default async function bridge() {
  const bridge = (
    await fetch("https://raw.githubusercontent.com/megaeth-labs/mega-tokenlist/refs/heads/main/megaeth.tokenlist.json")
  ).tokens as any[];

  const tokens: Token[] = [];
  const nonNativeMap = {} as any
  bridge.forEach((token: any) => {
    if (token.chainId === 4326
      //  || token.extensions?.bridgeType !== 'canonical'
      )  return;
    nonNativeMap[token.name] = token
  })

  bridge.forEach((token) => {
    const {chainId, address, symbol, decimals, extensions } = token;
    if (chainId !== 4326) return;
    const sourceToken = nonNativeMap[token.name]
    if (!sourceToken) return;
    const sourceChain = chainIdMap[sourceToken.chainId];
    if (!sourceChain) return;

    tokens.push({
      from: `megaeth:${address}`.toLowerCase(),
      to: lowercaseAddress(`${sourceChain}:${sourceToken.address}`),
      symbol,
      decimals,
    });
  });

  return tokens;
}
