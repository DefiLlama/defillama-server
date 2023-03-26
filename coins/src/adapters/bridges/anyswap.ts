import { fetch } from "../utils";
import { Token } from "./index";

const chainIdToSlug = {
  1: "ethereum",
  250: "fantom",
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
  288: "boba",
  25: "cronos",
  1313161554: "aurora",
  32659: "fusion",
  61: "ethereumclassic",
  2000: "dogechain",
  35935: "dfk",
  57: "syscoin",
  1284: "moonbeam",
  9001: "evmos",
  30: "rsk",
  1030: "conflux",
  47805: "rei",
  2001: "milkomeda",
  106: "velas",
  42262: "oasis",
  592: "astar"
} as { [chainId: number]: string };

export default async function bridge(): Promise<Token[]> {
  const multichainTokens = (
    await fetch("https://netapi.anyswap.net/bridge/v2/info")
  ).bridgeList as any[];

  const tokens: Token[] = [];

  multichainTokens.map((token) => {
    const destinationChain = chainIdToSlug[token.chainId];
    const originChain = chainIdToSlug[token.srcChainId];
    let srcToken = token.srcToken;
    const destinationToken = token.token;

    if (destinationChain === undefined || originChain === undefined || typeof srcToken !== "string") {
      return;
    }

    if (!srcToken.includes("0x")){
      if(/^[A-Z]*$/.test(srcToken)){ // ETH, BNB...
        srcToken = "0x0000000000000000000000000000000000000000";
      } else {
        console.log(`Weird token on`, token)
        return
      }
    }

    if(destinationChain === originChain && srcToken === destinationToken){
      if(token.underlying?.includes("0x")){
        srcToken = token.underlying
      } else {
        return
      }
    }

    tokens.push({
      from: `${destinationChain}:${destinationToken}`,
      to: `${originChain}:${srcToken}`,
      symbol: token.symbol,
      decimals: token.decimals
    });
  });

  return tokens;
}
