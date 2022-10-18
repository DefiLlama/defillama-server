import { fetch } from "../utils";
import { Token } from "./index";
const chainIdToSlug = {
  1: "ethereum",
  250: "fantom",
  //32659: "fusion",
  56: "bsc",
  128: "heco",
  137: "polygon",
  100: "xdai",
  43114: "avax",
  1666600000: "harmony",
  321: "kcc",
  66: "okexchain",
  1285: "moonriver",
  42161: "arbitrum",
  4689: "iotex",
  336: "shiden",
  42220: "celo",
  40: "telos",
  122: "fuse",
  //57: "syscoin",
  288: "boba",
  25: "cronos",
  1313161554: "aurora"
} as { [chainId: number]: string };

export default async function bridge(): Promise<Token[]> {
  const multichainTokens = (
    await fetch("https://netapi.anyswap.net/bridge/v2/info")
  ).bridgeList as any[];

  const tokens: Token[] = [];
  multichainTokens.map((token) => {
    const destinationChain = chainIdToSlug[token.chainId];
    const originChain = chainIdToSlug[token.srcChainId];
    let srcToken = token.srcToken ?? "";
    if (destinationChain === undefined || originChain === undefined) return;

    if (!srcToken.includes("0x")) {
      srcToken = "0x0000000000000000000000000000000000000000";
    }
    const destinationToken = token.token;
    tokens.push({
      from: `${destinationChain}:${destinationToken}`,
      to: `${originChain}:${srcToken}`,
      symbol: token.symbol,
      decimals: token.decimals
    });
  });

  return tokens;
}
