import nodeFetch from "node-fetch"
import erc20 from "@defillama/sdk/build/erc20";

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
        const decimals = await erc20.decimals(address, "polygon")
        const symbol = await erc20.symbol(chain, "polygon")
        return {
            from: `${chain}:${address}`,
            to,
            decimals: Number(decimals.output),
            symbol: symbol.output
        }
    }
}