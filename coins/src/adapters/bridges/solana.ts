import { fetch } from "../utils"

interface Token {
    "chainId": 101,
    "address": string,
    "symbol": string,
    "name": string,
    "decimals": number,
    "logoURI": string,
    "tags": string[],
    "extensions": {
        [id: string]: string
    } | undefined
}

export default async function bridge() {
    const tokenlist = (await fetch(
        "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json"
    )).tokens as Token[];
    return tokenlist.map(token => {
        const coingeckoId = token.extensions?.coingeckoId;
        if(coingeckoId === undefined){
            return null
        }
        return {
            from: `solana:${token.address}`,
            to: `coingecko#${coingeckoId}`,
            symbol: token.symbol,
            decimals: token.decimals
        }
    }).filter(t=>t!==null)
}