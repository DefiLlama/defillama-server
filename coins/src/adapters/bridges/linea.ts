import { fetch, formatExtraTokens } from "../utils";

const chain = 'linea'
export default async function bridge() {
  const bridge = (
    await fetch("https://raw.githubusercontent.com/Consensys/linea-token-list/main/json/linea-mainnet-token-shortlist.json")
  ).tokens as any[];

  return bridge
  .filter((token) => token.chainId === 59144 && token.extension?.rootChainId === 1 && token.tokenType.includes('bridged'))
    .map((token) => {
      const bridged = token.extension.rootAddress;
      return {
        from: `${chain}:${token.address}`,
        to: `ethereum:${bridged}`,
        symbol: token.symbol,
        decimals: token.decimals
      };
    })
    .filter((t) => t.to != "null")
    .concat(extraTokens);
}

const extraTokens = formatExtraTokens(chain, []);
