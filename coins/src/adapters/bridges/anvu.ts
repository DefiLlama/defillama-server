import { lowercaseAddress } from "../../utils/processCoin";
import { fetch } from "../utils";
import { Token } from "./index";

export default async function bridge() {
  const bridge = (
    await fetch("https://starknet.api.avnu.fi/v1/starknet/tokens")
  ).content as any[];

  const tokens: Token[] = [];

  bridge.map((token) => {
    const { address, symbol, decimals, extensions: { coingeckoId} } = token;
    tokens.push({
      from: lowercaseAddress(`starknet:${address}`),
      to: `coingecko#${coingeckoId}`,
      symbol,
      decimals,
    });
  });

  return tokens;
}