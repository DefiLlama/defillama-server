import nodeFetch from "node-fetch"
import {decimals, symbol} from "@defillama/sdk/build/erc20";

export const fetch = async (url: string) => nodeFetch(url).then(r => r.json())

export function formatExtraTokens(chain: string, tokens: [string, string, string, number][]) {
    return tokens.map(([fromAddress, to, symbol, decimals]) => ({
        from: `${chain}:${fromAddress}`,
        to,
        symbol,
        decimals,
    }))
}

export function getAllInfo(address: string, chain:string, to:string) {
    return async () => {
        const decimalsR = await decimals(address, chain as any)
        const symbolR = await symbol(address, chain as any)
        return {
            from: `${chain}:${address}`,
            to,
            decimals: Number(decimalsR.output),
            symbol: symbolR.output as string,
        }
    }
}