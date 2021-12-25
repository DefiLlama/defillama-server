import nodeFetch from "node-fetch"

export const fetch = async (url: string) => nodeFetch(url).then(r => r.json())

export function formatExtraTokens(chain:string, tokens:[string, string, string, number][]){
    return tokens.map(([fromAddress, to, symbol, decimals]) => ({
        from: `${chain}:${fromAddress}`,
        to,
        symbol,
        decimals,
    }))
}