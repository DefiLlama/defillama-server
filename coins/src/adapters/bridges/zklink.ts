import { Token } from "./index";
import { fetch, } from "../utils";

export default async function bridge(): Promise<Token[]> {
  const allTokens = []
  let page = 1
  do {
    const { items, meta } = await fetch("https://explorer-api.zklink.io/tokens?limit=100&page="+page)
    allTokens.push(...items)
    page++
    if (page >= meta.totalPages) break;
  } while (page < 25)

  const tokens: Token[] = [{
    from: 'zklink:0x000000000000000000000000000000000000800A',
    to: 'ethereum:0x0000000000000000000000000000000000000000',
    symbol: 'WETH',
    decimals: 18
  }];
  allTokens
    .filter((token) => token.l1Address && token.l2Address && token.networkKey)
    .map((token) => {
      let sourceChain
      switch (token.networkKey) {
        case 'ethereum': sourceChain = 'ethereum'; break;
        case 'zksync': sourceChain = 'era'; break;
        case 'manta': sourceChain = 'manta'; break;
        case 'blast': sourceChain = 'blast'; break;
        case 'arbitrum': sourceChain = 'arbitrum'; break;
        case 'mantle': sourceChain = 'mantle'; break;
        case 'base': sourceChain = 'base'; break;
        case 'optimism': sourceChain = 'optimism'; break;
        case 'primary': sourceChain = 'linea'; break;
        default: console.log('zklink Unknown networkKey', token.networkKey)
      }
      if (!sourceChain) return;
      tokens.push({
        from: `zklink:${token.l2Address}`,
        to: `${sourceChain}:${token.l1Address}`,
        symbol: token.symbol,
        decimals: token.decimals
      });
    });

  return tokens
}
